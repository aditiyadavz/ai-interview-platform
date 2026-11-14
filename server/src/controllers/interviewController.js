const Interview = require("../models/Interview");
const User = require("../models/User");
const { submitAndScore, getResult } = require("./submitHandler");

const startInterview = async (req, res) => {
  try {
    const { role, difficulty = "medium", questions } = req.body;
    if (!role || !questions || !questions.length)
      return res.status(400).json({ message: "role and questions are required" });

    const interview = await Interview.create({
      user: req.user._id, role, difficulty, questions, answers: [], completed: false,
    });
    res.status(201).json({ interviewId: interview._id, message: "Interview started" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Scoring, streaks, badges and notifications live in services/interviewFinalizer.js
const submitInterview = (req, res) => submitAndScore(req, res);

const getHistory = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("role difficulty totalScore verdict completed createdAt");
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) return res.status(404).json({ message: "Interview not found" });
    res.json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProgress = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user._id, completed: true })
      .sort({ createdAt: 1 });

    const user = await User.findById(req.user._id)
      .select("currentStreak longestStreak lastInterviewDate");

    if (!interviews.length) {
      return res.json({
        scoreTrend: [], roleBreakdown: [], weakTopics: [],
        avgResponseTime: 0, totalSessions: 0, avgScore: 0, bestScore: 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
      });
    }

    const scoreTrend = interviews.slice(-20).map((iv) => ({
      date: iv.createdAt, score: iv.totalScore, role: iv.role,
    }));

    const roleMap = {};
    interviews.forEach((iv) => {
      if (!roleMap[iv.role]) roleMap[iv.role] = { role: iv.role, count: 0, totalScore: 0 };
      roleMap[iv.role].count += 1;
      roleMap[iv.role].totalScore += iv.totalScore;
    });
    const roleBreakdown = Object.values(roleMap).map((r) => ({
      role: r.role, count: r.count, avgScore: Math.round(r.totalScore / r.count),
    }));

    const topicMap = {};
    interviews.forEach((iv) => {
      (iv.answers || []).forEach((a) => {
        const topic = a.topic || "General";
        if (!topicMap[topic]) topicMap[topic] = { topic, count: 0, totalScore: 0 };
        topicMap[topic].count += 1;
        topicMap[topic].totalScore += a.score || 0;
      });
    });
    const weakTopics = Object.values(topicMap)
      .map((t) => ({ topic: t.topic, avgScore: Math.round(t.totalScore / t.count), count: t.count }))
      .filter((t) => t.count >= 2)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    let confidenceSum = 0, confidenceCount = 0;
    interviews.forEach((iv) => {
      (iv.answers || []).forEach((a) => {
        if (typeof a.confidence === "number") { confidenceSum += a.confidence; confidenceCount++; }
      });
    });
    const avgConfidence = confidenceCount ? Math.round(confidenceSum / confidenceCount) : 0;

    const avgScore  = Math.round(interviews.reduce((s, iv) => s + iv.totalScore, 0) / interviews.length);
    const bestScore = Math.max(...interviews.map((iv) => iv.totalScore));

    res.json({
      scoreTrend, roleBreakdown, weakTopics, avgConfidence,
      totalSessions: interviews.length, avgScore, bestScore,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
      lastInterviewDate: user?.lastInterviewDate || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { startInterview, submitInterview, getResult, getHistory, getInterview, getProgress };