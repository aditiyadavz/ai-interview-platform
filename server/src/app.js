const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

const authRoutes           = require("./routes/authRoutes");
const interviewRoutes      = require("./routes/interviewRoutes");
const aiRoutes             = require("./routes/aiRoutes");
const userRoutes           = require("./routes/userRoutes");
const { errorHandler }     = require("./middleware/errorMiddleware");
const notificationRoutes   = require("./routes/notificationRoutes");
const uploadRoutes         = require("./routes/uploadRoutes");
const friendRoomRoutes     = require("./routes/friendRoomRoutes");
const emailReminderRoutes  = require("./routes/emailReminderRoutes");
const achievementsRoutes   = require("./routes/achievementsRoutes");   // ← NEW
const turnRoutes           = require("./routes/turnRoutes");
const resumeInterviewRoutes = require("./routes/resumeInterviewRoutes");   // ← NEW
const statsRoutes          = require("./routes/statsRoutes");             // ← NEW: real homepage stats
const testimonialRoutes    = require("./routes/testimonialRoutes");       // ← NEW: real user testimonials
const contactRoutes        = require("./routes/contactRoutes");           // ← NEW: real contact form emails

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ── Security hardening ──────────────────────────────────────────────────────
app.use(helmet());                 // sets safe HTTP headers (HSTS, no-sniff, frame-deny, etc.)
app.use(mongoSanitize());          // strips $ / . operators from req.body/query/params to block NoSQL injection

// General limiter — applies to every request as a baseline abuse guard
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 300,                   // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please slow down and try again shortly." },
});
app.use(generalLimiter);

// Stricter limiter for auth endpoints — mitigates brute-force login/register attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // 20 attempts per IP per 15 min across register+login
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts — please wait 15 minutes before trying again." },
});

// Stricter limiter for AI-cost endpoints — protects Gemini quota/cost from abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,                    // 40 AI-generation calls per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests — please wait a few minutes before trying again." },
});

// Contact form limiter — this endpoint sends real email, so it needs its
// own tight cap independent of the general limiter to prevent spam/abuse.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                     // 5 submissions per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent — please wait a while before sending another." },
});

// TURN credentials are public (anonymous guests need them) — cap per IP so
// the relay can't be farmed for bandwidth.
const turnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please try again shortly." },
});

app.get("/", (req, res) => res.json({ status: "API running ✅" }));

app.use("/api/auth",          authLimiter, authRoutes);
// Submitting an interview makes one Gemini call per answer plus one for feedback
app.use("/api/interview/:id/submit", aiLimiter);
app.use("/api/interview",     interviewRoutes);
app.use("/api/ai",            aiLimiter, aiRoutes);
app.use("/api/user",          userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/friend-room",   friendRoomRoutes);
app.use("/api/reminders",     emailReminderRoutes);
app.use("/api/achievements",  achievementsRoutes);   // ← NEW
app.use("/api/turn",          turnLimiter, turnRoutes);
app.use("/api/resume-interview", aiLimiter, resumeInterviewRoutes);   // ← NEW
app.use("/api/stats",         statsRoutes);          // ← NEW
app.use("/api/testimonials",  testimonialRoutes);    // ← NEW
app.use("/api/contact",       contactLimiter, contactRoutes);   // ← NEW

app.use(errorHandler);

module.exports = app;