const express = require("express");
const router = express.Router();
const { upload, cloudinary } = require("../config/cloudinary");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { blockDemo } = require("../middleware/demoGuard");

router.post("/resume", protect, blockDemo, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please attach a PDF, DOC, or DOCX file" });
    const resumeUrl = req.file.path;
    await User.findByIdAndUpdate(req.user._id, { resumeUrl });
    res.json({ success: true, resumeUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;