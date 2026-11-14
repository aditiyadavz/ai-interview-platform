const Interview = require("../models/Interview");
const User = require("../models/User");
const { buildResumeContext, generateResumeInterview } = require("../services/resumeInterviewGenerator");
const { submitAndScore } = require("./submitHandler");

// ── Start a resume-based interview (Technical → HR, no timer) ──
const startResumeInterview = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const hasProfileContext = !!(
      user.summary?.trim() || user.skills?.length || user.experience?.trim() || user.projectsText?.trim()
    );
    if (!user.resumeUrl && !hasProfileContext) {
      return res.status(400).json({
        message: "Please upload your resume or fill in your profile (summary, skills, experience, projects) before starting a resume-based interview.",
      });
    }

    const resumeContext = await buildResumeContext(user);
    const { technical, hr, source } = await generateResumeInterview(resumeContext);

    const questions = [...technical, ...hr];
    const phases = [
      ...technical.map(() => "technical"),
      ...hr.map(() => "hr"),
    ];

    const interview = await Interview.create({
      user: req.user._id,
      role: "resume-based",
      difficulty: "strict",
      interviewType: "resume",
      questions,
      answers: [],
      completed: false,
    });

    res.status(201).json({
      interviewId: interview._id,
      technicalQuestions: technical,
      hrQuestions: hr,
      phases,
      source,
      message: "Resume-based interview generated",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Submit resume-based interview — includes proctoring summary ──
const submitResumeInterview = (req, res) => {
  // Strict proctoring: any reported terminate, or 3+ violations, is flagged for review.
  const { proctor } = req.body;
  const violations = Math.max(0, Number(proctor?.violations) || 0);
  return submitAndScore(req, res, {
    proctor: {
      violations,
      flagged: !!proctor?.flagged || violations >= 3,
      log: Array.isArray(proctor?.log) ? proctor.log.slice(0, 50).map((l) => String(l).slice(0, 200)) : [],
    },
  });
};

module.exports = { startResumeInterview, submitResumeInterview };