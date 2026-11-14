const Interview = require("../models/Interview");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getAllBadgesWithStatus } = require("../services/badgeEngine");

/* ─────────────────────────────────────────────────────────────────────────────
   CRITICAL FIX: The original controller queried { completed: true } (boolean).
   Many interview flows store completion as { status: "completed" } (string).
   This helper builds a query that matches BOTH so no interviews are missed.
   ───────────────────────────────────────────────────────────────────────────── */
function completedQuery(extra = {}) {
  return {
    $or: [
      { completed: true },
      { status: "completed" },
    ],
    ...extra,
  };
}

// ── GET /api/achievements/badges ──────────────────────────────────────────────
const getBadges = async (req, res) => {
  try {
    const [interviews, user] = await Promise.all([
      Interview.find(completedQuery({ user: req.user._id })).sort({ createdAt: 1 }),
      User.findById(req.user._id),
    ]);

    console.log(`[getBadges] user=${req.user._id} found ${interviews.length} completed interviews`);

    const badges  = getAllBadgesWithStatus(interviews, user);
    const earned  = badges.filter(b => b.earned).length;
    res.json({ badges, earned, total: badges.length });
  } catch (err) {
    console.error("[getBadges] error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/achievements/leaderboard ─────────────────────────────────────────
// Sessions beyond this count stop adding to rankScore, so the ranking rewards
// quality over spamming lots of interviews.
const MAX_RANKED_SESSIONS = 20;

// Friend-room interviews carry human star ratings, and the interviewer is
// always recorded as 100, so they'd let anyone farm the leaderboard by hosting
// empty rooms. Legacy friend interviews (before interviewType "friend" existed)
// are recognised by their generated feedback text.
const leaderboardMatch = (excludeUserIds) => ({
  ...completedQuery(),
  user: { $nin: excludeUserIds },
  interviewType: { $ne: "friend" },
  aiFeedback: { $not: /^Friend interview session/ },
});

const getLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();

    // The shared demo account's history is seeded sample data — never rank it.
    const demoIds = await User.find({ isDemo: true }).distinct("_id");

    // Group in MongoDB instead of loading every interview into memory.
    const grouped = await Interview.aggregate([
      { $match: leaderboardMatch(demoIds) },
      {
        $group: {
          _id:         "$user",
          avgScore:    { $avg: { $ifNull: ["$totalScore", 0] } },
          bestScore:   { $max: { $ifNull: ["$totalScore", 0] } },
          sessions:    { $sum: 1 },
          roles:       { $addToSet: "$role" },
          excellent:   { $sum: { $cond: [{ $eq: ["$verdict", "Excellent"] }, 1, 0] } },
          good:        { $sum: { $cond: [{ $eq: ["$verdict", "Good"] }, 1, 0] } },
          lastSession: { $max: "$createdAt" },
        },
      },
    ]);

    if (grouped.length === 0) {
      return res.json({ leaderboard: [], currentUserEntry: null, total: 0 });
    }

    const users = await User.find({ _id: { $in: grouped.map((g) => g._id) } })
      .select("name profilePic college degree longestStreak currentStreak")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const ranked = grouped
      .map((g) => {
        const uid = g._id.toString();
        const u = userMap.get(uid);
        if (!u) return null; // interview whose user was deleted

        const avgScore      = Math.round(g.avgScore);
        const bestScore     = g.bestScore;
        const currentStreak = u.currentStreak || 0;
        const rankedSessions = Math.min(g.sessions, MAX_RANKED_SESSIONS);
        const rankedExcellent = Math.min(g.excellent, MAX_RANKED_SESSIONS);
        const rankedGood      = Math.min(g.good, MAX_RANKED_SESSIONS - rankedExcellent);

        const rankScore =
          avgScore        * 0.5 +
          bestScore       * 0.2 +
          rankedSessions  * 2.0 +
          currentStreak   * 0.3 +
          rankedExcellent * 3.0 +
          rankedGood      * 1.5;

        return {
          _id:           uid,
          name:          u.name,
          profilePic:    u.profilePic || "",
          college:       u.college    || "",
          degree:        u.degree     || "",
          longestStreak: u.longestStreak || 0,
          currentStreak,
          totalSessions: g.sessions,
          avgScore,
          bestScore,
          lastSession:   g.lastSession,
          uniqueRoles:   g.roles.length,
          rankScore,
        };
      })
      .filter(Boolean)
      // Ties: higher average first, then whoever got there earlier.
      .sort((a, b) =>
        b.rankScore - a.rankScore ||
        b.avgScore - a.avgScore ||
        new Date(a.lastSession) - new Date(b.lastSession)
      )
      .map((u, i) => ({
        ...u,
        rank:          i + 1,
        isCurrentUser: u._id === currentUserId,
        badge:         getBadge(i + 1),
      }));

    let currentUserEntry = ranked.find((u) => u.isCurrentUser) || null;
    if (currentUserEntry && currentUserEntry.rank > 50) {
      currentUserEntry = { ...currentUserEntry, outsideTop50: true };
    }

    res.json({ leaderboard: ranked.slice(0, 50), currentUserEntry, total: ranked.length });
  } catch (err) {
    console.error("[getLeaderboard] error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/achievements/certificate/:interviewId ────────────────────────────
const getCertificate = async (req, res) => {
  try {
    // find the interview — accept either completion flag
    const interview = await Interview.findOne({
      _id:  req.params.interviewId,
      user: req.user._id,
      $or:  [{ completed: true }, { status: "completed" }],
    });

    if (!interview)
      return res.status(404).json({ message: "Interview not found" });

    // resolve score field
    const score =
      typeof interview.totalScore   === "number" ? interview.totalScore   :
      typeof interview.overallScore === "number" ? interview.overallScore :
      typeof interview.score        === "number" ? interview.score        : 0;

    if (score < 70)
      return res.status(403).json({ message: "Score must be 70%+ to earn a certificate" });

    const user = await User.findById(req.user._id).select("name email college degree");

    res.json({
      certificate: {
        recipientName:  user.name,
        recipientEmail: user.email,
        college:        user.college || "",
        degree:         user.degree  || "",
        role:           interview.role,
        difficulty:     interview.difficulty,
        score,
        verdict:        interview.verdict,
        completedAt:    interview.updatedAt,
        interviewId:    interview._id,
        certificateId:  `ACEPREP-${interview._id.toString().slice(-8).toUpperCase()}`,
      },
    });
  } catch (err) {
    console.error("[getCertificate] error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/achievements/stats ───────────────────────────────────────────────
const getAchievementStats = async (req, res) => {
  try {
    const [interviews, user] = await Promise.all([
      Interview.find(completedQuery({ user: req.user._id })).sort({ createdAt: 1 }),
      User.findById(req.user._id).select("longestStreak currentStreak name"),
    ]);

    console.log(`[getAchievementStats] user=${req.user._id} found ${interviews.length} completed interviews`);

    const getScore = (iv) =>
      typeof iv.totalScore   === "number" ? iv.totalScore   :
      typeof iv.overallScore === "number" ? iv.overallScore :
      typeof iv.score        === "number" ? iv.score        : 0;

    const totalSessions      = interviews.length;
    const scores             = interviews.map(getScore);
    const avgScore           = totalSessions ? Math.round(scores.reduce((a, b) => a + b, 0) / totalSessions) : 0;
    const bestScore          = totalSessions ? Math.max(...scores) : 0;
    const uniqueRoles        = new Set(interviews.map(i => i.role)).size;
    const certificatesEarned = interviews.filter(i => getScore(i) >= 70).length;

    const badges       = getAllBadgesWithStatus(interviews, user);
    const badgesEarned = badges.filter(b => b.earned).length;

    res.json({
      totalSessions,
      avgScore,
      bestScore,
      uniqueRoles,
      certificatesEarned,
      badgesEarned,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
    });
  } catch (err) {
    console.error("[getAchievementStats] error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── rank badge helper ─────────────────────────────────────────────────────────
const getBadge = (rank) => {
  if (rank === 1) return { label: "🥇 Champion",    color: "#FFD700" };
  if (rank === 2) return { label: "🥈 Runner Up",   color: "#C0C0C0" };
  if (rank === 3) return { label: "🥉 Third Place", color: "#CD7F32" };
  if (rank <= 10) return { label: "🏆 Top 10",      color: "#00e5ff" };
  if (rank <= 25) return { label: "⭐ Top 25",      color: "#a78bfa" };
  if (rank <= 50) return { label: "🔥 Top 50",      color: "#f59e0b" };
  return null;
};

module.exports = { getBadges, getLeaderboard, getCertificate, getAchievementStats };