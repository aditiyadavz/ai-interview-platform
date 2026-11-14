const mongoose = require("mongoose");
const Interview = require("../models/Interview");
const { sanitizeAnswers } = require("../services/scoreAnswers");
const {
  claimForScoring, finalizeInterview, markScoringFailed, buildResult,
} = require("../services/interviewFinalizer");
const { isQueueEnabled, enqueueScoring } = require("../services/scoringQueue");

/**
 * Shared submit flow for standard and resume-based interviews.
 *   200 { status: "done", ...result }      scored inline (no Redis)
 *   202 { status: "pending", interviewId } queued — poll GET /api/interview/:id/result
 */
const submitAndScore = async (req, res, { proctor = null } = {}) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id })
      .select("questions completed");
    if (!interview) return res.status(404).json({ message: "Interview not found" });
    if (interview.completed) return res.status(400).json({ message: "Already submitted" });

    // Never trust client-sent fields: whitelist them and take question text
    // from the stored interview.
    const answers = sanitizeAnswers(req.body.answers, interview.questions);
    if (!answers.length) return res.status(400).json({ message: "answers array is required" });

    const claimed = await claimForScoring({
      interviewId: interview._id, userId: req.user._id, answers, proctor,
    });
    if (!claimed) return res.status(409).json({ message: "This interview is already being scored" });

    if (isQueueEnabled()) {
      try {
        await enqueueScoring(claimed._id);
        return res.status(202).json(buildResult(claimed));
      } catch (err) {
        // Redis unavailable — degrade to inline scoring rather than failing the submit.
        console.error("⚠️  Could not queue scoring, scoring inline:", err.message);
      }
    }

    try {
      return res.json(await finalizeInterview(claimed._id));
    } catch (err) {
      await markScoringFailed(claimed._id, err).catch(() => {});
      throw err;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/interview/:id/result — polled by the client while status is "pending".
const getResult = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid interview ID" });
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) return res.status(404).json({ message: "Interview not found" });
    res.json(buildResult(interview));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitAndScore, getResult };
