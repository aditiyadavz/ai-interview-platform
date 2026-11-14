const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  sendSignupOtp, register, login, demoLogin, getMe,
  forgotPassword, resetPassword, changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { blockDemo } = require("../middleware/demoGuard");
const {
  validateSendOtp, validateRegister, validateLogin,
  validateForgotPassword, validateResetPassword, validateChangePassword,
} = require("../middleware/validate");
const router = express.Router();

// Extra-strict limiter on top of the router-level authLimiter — these endpoints
// send a real email per call, so they're the most abuse-sensitive routes here.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 sends per IP per 15 min (the otpService cooldown also guards per-email)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please wait a while before trying again." },
});

router.post("/send-otp",         otpLimiter, validateSendOtp,        sendSignupOtp);
router.post("/register",         validateRegister,                   register);
router.post("/login",            validateLogin,                      login);
router.post("/demo",                                                 demoLogin);
router.get("/me",                protect,                            getMe);

router.post("/forgot-password",  otpLimiter, validateForgotPassword, forgotPassword);
router.post("/reset-password",   validateResetPassword,              resetPassword);
router.post("/change-password",  protect, blockDemo, validateChangePassword, changePassword);

module.exports = router;