const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { sendOtp, verifyOtp } = require("../services/otpService");
const { notify } = require("../services/notificationService");

// Step 1 of signup: email a 6-digit code to prove the address is real and reachable.
const sendSignupOtp = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    await sendOtp({ email: normalizedEmail, name, purpose: "signup" });
    res.json({ message: "Verification code sent — check your inbox" });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Step 2 of signup: verify the code, then create the account. The account
// is never created without a valid, unexpired, unused OTP for that email.
const register = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp)
      return res.status(400).json({ message: "All fields, including the verification code, are required" });

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists)
      return res.status(400).json({ message: "Email already registered" });

    const result = await verifyOtp({ email: normalizedEmail, purpose: "signup", code: otp });
    if (!result.valid)
      return res.status(400).json({ message: result.message });

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      emailVerified: true,
    });

    notify({
      userId: user._id,
      type: "account_created",
      icon: "🎉",
      title: "Welcome to AI Interview Platform!",
      text: "Head to the Roles page to start your first mock interview.",
      link: "/roles",
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// One-click login to the shared demo account, so recruiters can look around
// without signing up. No password is involved: the server picks the account
// flagged isDemo, which demoGuard keeps read-only for sensitive actions.
// Disabled unless DEMO_LOGIN_ENABLED=true.
const demoLogin = async (req, res) => {
  try {
    if (process.env.DEMO_LOGIN_ENABLED !== "true")
      return res.status(404).json({ message: "Demo login is not enabled" });

    const user = await User.findOne({ isDemo: true });
    if (!user)
      return res.status(503).json({ message: "Demo account unavailable right now" });

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, isDemo: true },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, isDemo: !!req.user.isDemo });
};

// Step 1 of password reset: email a code IF the account exists. Always returns
// the same generic message either way, so this endpoint can't be used to
// probe which emails are registered.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && !user.isDemo) {
      try {
        await sendOtp({ email: normalizedEmail, name: user.name, purpose: "reset" });
      } catch (sendError) {
        // Swallow cooldown/send errors here — surfacing them would let an attacker
        // tell registered emails apart from unregistered ones by response shape.
        // If the user is spamming, they simply don't get a fresh code this time.
      }
    }

    // Identical response whether or not the account exists, and whether or not
    // a cooldown was hit — this endpoint can't be used to enumerate accounts.
    res.json({ message: "If that email is registered, a reset code has been sent." });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

// Step 2 of password reset: verify the code and set a new password.
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "Email, code, and new password are required" });

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || user.isDemo) return res.status(400).json({ message: "Invalid or expired code" });

    const result = await verifyOtp({ email: normalizedEmail, purpose: "reset", code: otp });
    if (!result.valid)
      return res.status(400).json({ message: result.message });

    user.password = newPassword; // pre-save hook re-hashes this
    await user.save();

    notify({
      userId: user._id,
      type: "password_reset",
      icon: "🔐",
      title: "Your password was reset",
      text: "If this wasn't you, contact support immediately.",
      link: "/profile?section=security",
    });

    res.json({ message: "Password reset — you can now log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password while logged in — requires the current password so a
// hijacked, still-open session can't silently lock the real owner out.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Current and new password are required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    if (newPassword === currentPassword)
      return res.status(400).json({ message: "New password must be different from the current password" });

    user.password = newPassword; // pre-save hook re-hashes this
    await user.save();

    notify({
      userId: user._id,
      type: "password_changed",
      icon: "🔐",
      title: "Your password was changed",
      text: "If this wasn't you, reset your password immediately and contact support.",
      link: "/profile?section=security",
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendSignupOtp, register, login, demoLogin, getMe,
  forgotPassword, resetPassword, changePassword,
};