/**
 * Everything that happens after a candidate submits an interview, shared by
 * standard and resume-based interviews, and by both ways of running it:
 *   - inline, inside the submit request (no Redis)
 *   - in the background, by the BullMQ worker (services/scoringQueue.js)
 *
 * Flow:  claimForScoring()  → answers saved, scoring.status = "pending"
 *        finalizeInterview() → AI scores + feedback, completed, streak, badges
 *        buildResult()       → what the client gets back (submit or polling)
 */
const Interview = require("../models/Interview");
const User = require("../models/User");
const { scoreAllAnswers } = require("./scoreAnswers");
const { generateSessionFeedback } = require("./feedbackGenerator");
const { notify, checkAndNotifyNewBadges } = require("./notificationService");
const { tagTopic } = require("../utils/topicTagger");

// A "pending" claim older than this is treated as abandoned (e.g. the server
// restarted mid-scoring) and may be submitted again.
const STALE_PENDING_MS = 5 * 60 * 1000;

const verdictFor = (score) =>
  score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Average" : "Needs Work";

/**
 * Atomically moves an interview into "pending" with the candidate's answers.
 * Returns the interview, or null if it doesn't belong to the user, is already
 * completed, or is already being scored — so double-clicks and concurrent
 * requests can never score (or count streaks for) the same interview twice.
 */
const claimForScoring = async ({ interviewId, userId, answers, proctor }) => {
  const set = {
    answers: answers.map((a) => ({ ...a, score: 0, topic: tagTopic(a.questionText) })),
    "scoring.status": "pending",
    "scoring.error": null,
    "scoring.startedAt": new Date(),
    "scoring.finishedAt": null,
    "scoring.newlyEarnedBadges": [],
  };
  if (proctor) set.proctor = proctor;

  return Interview.findOneAndUpdate(
    {
      _id: interviewId,
      user: userId,
      completed: false,
      $or: [
        { "scoring.status": { $ne: "pending" } },
        { "scoring.startedAt": { $lt: new Date(Date.now() - STALE_PENDING_MS) } },
      ],
    },
    { $set: set },
    { new: true }
  );
};

const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;
  const today = new Date();
  const lastKey = user.lastInterviewDate ? new Date(user.lastInterviewDate).toDateString() : null;
  if (lastKey === today.toDateString()) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  user.currentStreak = lastKey === yesterday.toDateString() ? user.currentStreak + 1 : 1;
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
  user.lastInterviewDate = today;
  await user.save();
};

const checkBadges = async (userId) => {
  try {
    const [interviews, user] = await Promise.all([
      Interview.find({ user: userId, completed: true }).sort({ createdAt: 1 }),
      User.findById(userId),
    ]);
    const { newlyEarned } = await checkAndNotifyNewBadges({ user, interviews });
    return newlyEarned.map((b) => ({ id: b.id, name: b.name, icon: b.icon, tier: b.tier, color: b.color }));
  } catch (err) {
    console.error("Badge check failed:", err.message);
    return [];
  }
};

/**
 * Scores a claimed interview and applies all side effects. Idempotent: if
 * the interview is already completed (e.g. a queue retry after a crash),
 * it just returns the stored result.
 */
const finalizeInterview = async (interviewId) => {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error(`Interview ${interviewId} not found`);
  if (interview.completed) return buildResult(interview);

  const isResume = interview.interviewType === "resume";
  const scores = await scoreAllAnswers(interview.answers);

  interview.answers.forEach((a, i) => { a.score = scores[i]; });
  const totalScore = Math.round(scores.reduce((s, x) => s + x, 0) / (scores.length || 1));
  interview.totalScore = totalScore;
  interview.verdict = verdictFor(totalScore);
  interview.aiFeedback = await generateSessionFeedback(
    isResume ? "resume-based" : interview.role,
    interview.answers,
    totalScore
  );
  interview.completed = true;
  await interview.save(); // must be completed before badges are counted

  await updateStreak(interview.user);
  const newlyEarnedBadges = await checkBadges(interview.user);

  if (totalScore >= 70) {
    notify({
      userId: interview.user,
      type: "certificate_earned",
      icon: "🎓",
      title: "Certificate unlocked",
      text: isResume
        ? `You scored ${totalScore}% on your resume-based interview — your certificate is ready to download.`
        : `You scored ${totalScore}% — your certificate for this interview is ready to download.`,
      link: "/achievements",
    });
  }

  interview.scoring.status = "done";
  interview.scoring.finishedAt = new Date();
  interview.scoring.newlyEarnedBadges = newlyEarnedBadges;
  await interview.save();
  return buildResult(interview);
};

const markScoringFailed = (interviewId, err) =>
  Interview.updateOne(
    { _id: interviewId, completed: false },
    { $set: { "scoring.status": "failed", "scoring.error": String(err?.message || err).slice(0, 300) } }
  );

const statusOf = (interview) => {
  if (interview.scoring?.status === "failed") return "failed";
  if (interview.completed && interview.scoring?.status !== "pending") return "done";
  if (interview.scoring?.status === "pending" || interview.completed) return "pending";
  return "not_submitted";
};

const buildResult = (interview) => {
  const status = statusOf(interview);
  const result = { status, interviewId: interview._id };
  if (status === "done") {
    Object.assign(result, {
      message: "Interview submitted",
      totalScore: interview.totalScore,
      verdict: interview.verdict,
      aiFeedback: interview.aiFeedback,
      newlyEarnedBadges: interview.scoring?.newlyEarnedBadges || [],
    });
    if (interview.interviewType === "resume") result.proctor = interview.proctor;
  }
  if (status === "failed") result.message = "Scoring failed — please submit again.";
  return result;
};

module.exports = { claimForScoring, finalizeInterview, markScoringFailed, buildResult, STALE_PENDING_MS };
