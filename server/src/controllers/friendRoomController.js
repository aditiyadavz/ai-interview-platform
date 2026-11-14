const { customAlphabet } = require("nanoid");
const FriendInterviewRoom = require("../models/FriendInterviewRoom");
const Interview = require("../models/Interview");
const User = require("../models/User");
const { generateQuestions } = require("../services/questionGenerator");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateRoomCode = customAlphabet(CODE_ALPHABET, 6);

// ── Create room (host only, must be logged in) ──
const createRoom = async (req, res) => {
  try {
    const { role = "frontend", difficulty = "medium", company = null, hostIsInterviewer = true } = req.body;
    const { questions, source } = await generateQuestions(role, difficulty, 5, { company });

    let code, exists = true, attempts = 0;
    do {
      code = generateRoomCode();
      exists = await FriendInterviewRoom.exists({ code });
      attempts++;
    } while (exists && attempts < 5);

    const room = await FriendInterviewRoom.create({
      code,
      host: req.user._id,
      hostName: req.user.name || "Host",
      role, difficulty, company, questions,
      questionsSource: source || "ai",
      hostIsInterviewer,
      status: "waiting",
    });

    res.status(201).json({
      code: room.code,
      roomId: room._id,
      role: room.role,
      difficulty: room.difficulty,
      company: room.company,
      hostIsInterviewer: room.hostIsInterviewer,
      questionsSource: room.questionsSource,
      joinUrl: `${(process.env.CLIENT_URLS || process.env.CLIENT_URL || "").split(",")[0].trim()}/friend-interview/join/${room.code}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get room by code — public, used by join page ──
const getRoomByCode = async (req, res) => {
  try {
    const room = await FriendInterviewRoom.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found or has expired" });
    if (room.status === "completed") return res.status(410).json({ message: "This interview has already ended" });

    res.json({
      code: room.code,
      hostId: room.host.toString(),       // ← needed for client-side role verification
      hostName: room.hostName,
      guestName: room.guestName,
      role: room.role,
      difficulty: room.difficulty,
      company: room.company,
      status: room.status,
      hostIsInterviewer: room.hostIsInterviewer,
      questionCount: room.questions.length,
      questionsSource: room.questionsSource,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Helper: update streak for a user ──
const updateStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const today = new Date().toDateString();
    const lastKey = user.lastInterviewDate ? new Date(user.lastInterviewDate).toDateString() : null;
    if (lastKey !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      user.currentStreak = lastKey === yesterday.toDateString() ? (user.currentStreak || 0) + 1 : 1;
      user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
      user.lastInterviewDate = new Date();
      await user.save();
    }
  } catch { /* non-critical */ }
};

// ── Finish room — saves history for both users ──
// Uses optionalAuth so both logged-in users can call it
const finishRoom = async (req, res) => {
  try {
    const room = await FriendInterviewRoom.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.status === "completed") {
      // Already finished — return stored scorecard data
      return res.json({
        message: "Already completed",
        candidateScore: room.candidateScore,
        candidateVerdict: room.candidateVerdict,
        hostInterviewId: room.hostInterviewId,
        guestInterviewId: room.guestInterviewId,
      });
    }

    // ── Who is allowed to finish this room? ──
    // Logged-in callers must be the room's host or its registered guest
    // (or claim the empty guest slot). Anonymous callers are only allowed
    // when they are the guest interviewer of a room with no registered guest.
    // The client-sent guestUserId is never trusted.
    const callerId = req.user?._id ? String(req.user._id) : null;
    const isHost   = callerId && callerId === String(room.host);
    const isGuest  = callerId && room.guest && callerId === String(room.guest);
    let guestId    = room.guest || null;

    if (callerId) {
      if (!isHost && !isGuest) {
        if (room.guest) return res.status(403).json({ message: "You are not part of this room" });
        guestId = req.user._id; // logged-in guest claiming the open guest slot
      }
    } else if (room.guest || room.hostIsInterviewer) {
      return res.status(401).json({ message: "Please log in to finish this interview" });
    }

    // ── Sanitize ratings/notes: one per stored question, rating 0–5 ──
    const rawAnswers = Array.isArray(req.body.candidateAnswers) ? req.body.candidateAnswers : [];
    const candidateAnswers = room.questions.map((q, i) => {
      const a = rawAnswers[i] && typeof rawAnswers[i] === "object" ? rawAnswers[i] : {};
      const r = Math.round(Number(a.rating));
      return {
        questionIndex: i,
        questionText:  q,
        notes:         typeof a.notes === "string" ? a.notes.slice(0, 2000) : "",
        rating:        Number.isFinite(r) ? Math.min(5, Math.max(0, r)) : 0,
      };
    });

    // ── Compute candidate score from star ratings (1-5 → 0-100) ──
    const rated = candidateAnswers.filter(a => a.rating > 0);
    const avgRating = rated.length
      ? rated.reduce((s, a) => s + a.rating, 0) / rated.length
      : 2.5;
    const candidateScore = Math.round((avgRating / 5) * 100);
    const candidateVerdict =
      candidateScore >= 85 ? "Excellent" :
      candidateScore >= 70 ? "Good" :
      candidateScore >= 50 ? "Average" : "Needs Work";

    // Interviewer score is fixed at 100 (they ran the session, not being evaluated)
    const interviewerScore   = 100;
    const interviewerVerdict = "Excellent";

    // Determine who is candidate vs interviewer
    // hostIsInterviewer=true  → host=interviewer, guest=candidate
    // hostIsInterviewer=false → host=candidate,   guest=interviewer
    const hostScore   = room.hostIsInterviewer ? interviewerScore   : candidateScore;
    const hostVerdict = room.hostIsInterviewer ? interviewerVerdict : candidateVerdict;
    const guestScore   = room.hostIsInterviewer ? candidateScore   : interviewerScore;
    const guestVerdict = room.hostIsInterviewer ? candidateVerdict : interviewerVerdict;

    // Build answer objects
    const answers = candidateAnswers.map((a, i) => ({
      questionIndex: i,
      questionText: a.questionText || `Question ${i + 1}`,
      transcript: a.notes || "",
      score: a.rating ? Math.round((a.rating / 5) * 100) : 0,
      confidence: a.rating ? Math.round((a.rating / 5) * 100) : 0,
      clarity: a.rating ? Math.round((a.rating / 5) * 100) : 0,
      sentiment: a.rating ? Math.round((a.rating / 5) * 100) : 0,
      aiFeedback: a.notes || "",
      topic: "General",
    }));

    const hostInterviewBase = {
      interviewType: "friend",
      role: room.role, difficulty: room.difficulty, company: room.company,
      questions: room.questions, answers,
      totalScore: hostScore, verdict: hostVerdict,
      aiFeedback: `Friend interview session. You were the ${room.hostIsInterviewer ? "interviewer" : "candidate"}. ${room.hostIsInterviewer ? "You conducted the session." : `Candidate rating: ${candidateVerdict} (${candidateScore}/100).`}`,
      completed: true,
    };

    const guestInterviewBase = {
      interviewType: "friend",
      role: room.role, difficulty: room.difficulty, company: room.company,
      questions: room.questions, answers,
      totalScore: guestScore, verdict: guestVerdict,
      aiFeedback: `Friend interview session. You were the ${room.hostIsInterviewer ? "candidate" : "interviewer"}. ${room.hostIsInterviewer ? `Candidate rating: ${candidateVerdict} (${candidateScore}/100).` : "You conducted the session."}`,
      completed: true,
    };

    // ── Create Interview doc for host ──
    let hostInterviewId = null;
    const hostInterview = await Interview.create({ ...hostInterviewBase, user: room.host });
    hostInterviewId = hostInterview._id;
    await updateStreak(room.host);

    // ── Create Interview doc for guest if they're a registered user ──
    let guestInterviewId = null;
    if (guestId) {
      const guestInterview = await Interview.create({ ...guestInterviewBase, user: guestId });
      guestInterviewId = guestInterview._id;
      await updateStreak(guestId);
    }

    // ── Save final state on room ──
    room.status = "completed";
    room.candidateAnswers = candidateAnswers;
    room.candidateScore = candidateScore;
    room.candidateVerdict = candidateVerdict;
    room.hostInterviewId = hostInterviewId;
    room.guestInterviewId = guestInterviewId;
    if (guestId && !room.guest) room.guest = guestId;
    await room.save();

    res.json({
      message: "Interview completed",
      candidateScore,
      candidateVerdict,
      hostInterviewId,
      guestInterviewId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Register guest user to room ──
const joinRoomAsUser = async (req, res) => {
  try {
    const room = await FriendInterviewRoom.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (String(room.host) === String(req.user._id))
      return res.status(400).json({ message: "You are the host of this room" });
    if (room.guest && String(room.guest) !== String(req.user._id))
      return res.status(403).json({ message: "This room already has a guest" });
    if (!room.guest) {
      room.guest = req.user._id;
      room.guestName = req.user.name || "Guest";
      room.status = "active";
      await room.save();
    }
    res.json({ message: "Joined", guestName: room.guestName });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRoom, getRoomByCode, finishRoom, joinRoomAsUser };