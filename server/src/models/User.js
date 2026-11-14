const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name:                 { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:             { type: String, required: true, minlength: 6 },
    emailVerified:        { type: Boolean, default: false }, // set true only after OTP verification at signup
    isDemo:               { type: Boolean, default: false }, // shared public demo account — see middleware/demoGuard.js
    notifiedBadgeIds:     { type: [String], default: [] },   // badge ids already notified — prevents re-notifying on every interview
    phone:                { type: String, default: "" },
    college:              { type: String, default: "" },
    degree:               { type: String, default: "" },
    organization:         { type: String, default: "" },
    linkedin:             { type: String, default: "" },
    github:               { type: String, default: "" },
    summary:              { type: String, default: "" },
    skills:               [{ type: String }],
    profilePic:           { type: String, default: "" },
    resumeUrl:            { type: String, default: "" },
    resumeText:           { type: String, default: "" },   // cached extracted text from resumeUrl
    resumeTextSourceUrl:  { type: String, default: "" },   // which resumeUrl the cached text belongs to
    experience:           { type: String, default: "" },
    projectsText:         { type: String, default: "" },
    certificationsText:   { type: String, default: "" },
    offerLetters:         { type: Array, default: [] },
    certificates:         { type: Array, default: [] },
    projectRepos:         { type: Array, default: [] },
    currentStreak:        { type: Number, default: 0 },
    longestStreak:        { type: Number, default: 0 },
    lastInterviewDate:    { type: Date, default: null },
    emailReminders:       { type: Boolean, default: false },  // ← NEW
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);