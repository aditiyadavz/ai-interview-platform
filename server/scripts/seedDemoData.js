/**
 * Seed script — creates (or refreshes) the shared demo account behind the
 * "Try the demo" button, with SAMPLE interview history so every page has
 * something to show: varied roles, dates over several weeks, an upward
 * score trend, a streak, and enough interviews to unlock most badges.
 *
 * The account is flagged `isDemo`, which:
 *   - lets POST /api/auth/demo log in to it with no password
 *   - blocks password/profile/resume/testimonial changes (middleware/demoGuard.js)
 *   - excludes it from the public homepage stats (its data is not real usage)
 *
 * Usage:
 *   cd server
 *   npm run seed            # then set DEMO_LOGIN_ENABLED=true on the server
 *
 * Safe to re-run — it wipes and regenerates ONLY the demo account's own
 * interviews (resetting anything visitors did), never real user data.
 */
require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Interview = require("../src/models/Interview");

const DEMO_EMAIL = "demo@aiinterview.dev";
// Nobody needs this password (demo login is passwordless and server-side),
// so it is random on every run — it can't be guessed, shared or changed.
const randomPassword = () => crypto.randomBytes(24).toString("base64url") + "1a";

const ROLES = ["frontend", "backend", "fullstack", "devops", "datascience", "dsa", "hr"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const TOPICS = ["React", "Node.js", "System Design", "Algorithms", "Databases", "Communication", "General"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const SAMPLE_QUESTIONS = [
  "Explain the virtual DOM and why it improves performance.",
  "What is the difference between SQL and NoSQL databases?",
  "How would you design a rate limiter for an API?",
  "Explain closures in JavaScript with an example.",
  "What is the CAP theorem and why does it matter?",
  "Describe a time you disagreed with a teammate — how did you resolve it?",
  "What is the time complexity of quicksort in the worst case?",
  "How does garbage collection work in Node.js?",
  "Explain the difference between authentication and authorization.",
  "What are Docker containers and how do they differ from VMs?",
];

const SAMPLE_TRANSCRIPTS = [
  "I approached this by first breaking down the problem into smaller parts, then considering the trade-offs of each approach before settling on the most maintainable solution.",
  "In my experience, the key is to balance performance with readability — I usually start with a simple implementation and optimize only once I've measured a real bottleneck.",
  "I'd handle this by isolating the failure case first, adding proper error boundaries, and making sure the system degrades gracefully instead of crashing entirely.",
  "This reminds me of a project where we faced a similar challenge — we ended up using a caching layer to reduce redundant computation and it cut response times significantly.",
];

const buildAnswers = (questions) =>
  questions.map((q, i) => {
    const score = rand(55, 96);
    return {
      questionIndex: i,
      questionText: q,
      transcript: pick(SAMPLE_TRANSCRIPTS),
      score,
      confidence: Math.max(0, score - rand(0, 10)),
      clarity: Math.max(0, score - rand(0, 8)),
      sentiment: Math.max(0, score - rand(0, 12)),
      aiFeedback: score >= 80 ? "Strong, structured answer with good depth." : "Decent attempt — could use more specific examples.",
      topic: pick(TOPICS),
    };
  });

const verdictFor = (score) =>
  score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Average" : "Needs Work";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("📡 Connected to MongoDB");

  // ── Create or reuse the demo user ──
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: "Demo Candidate",
      email: DEMO_EMAIL,
      password: randomPassword(),
      isDemo: true,
      emailVerified: true,
      college: "Sample University",
      degree: "B.Tech Computer Science",
      organization: "Sample profile — demo account",
      linkedin: "",
      github: "",
      summary: "(Sample profile for the demo account.) Full-stack developer with a focus on building scalable, user-first web applications. Passionate about clean architecture and continuous learning.",
      skills: ["React", "Node.js", "MongoDB", "TypeScript", "Docker", "AWS", "System Design", "Python"],
      experience: "2 years as a Software Engineer at a mid-size startup, building and scaling internal tools and customer-facing features. Previously interned at a fintech company working on payment infrastructure.",
      projectsText: "Built a real-time collaborative code editor using WebSockets and CRDTs. Led the migration of a monolithic Express app to a microservices architecture, reducing deploy time by 60%. Created an open-source CLI tool for automating changelog generation, used by 500+ developers.",
      certificationsText: "Sample certifications: cloud fundamentals, front-end development.",
    });
    console.log(`✅ Created demo user: ${DEMO_EMAIL}`);
  } else {
    // Re-assert the demo flag and rotate the password on every run.
    user.isDemo = true;
    user.emailVerified = true;
    user.password = randomPassword();
    console.log(`ℹ️  Demo user already exists — refreshing their interview history`);
  }

  // ── Wipe only THIS user's previous interviews before reseeding ──
  await Interview.deleteMany({ user: user._id });

  const NUM_INTERVIEWS = 22;
  const interviews = [];
  const now = Date.now();

  // Build a believable upward score trend over time (earlier = lower, recent = higher)
  for (let i = 0; i < NUM_INTERVIEWS; i++) {
    const daysAgo = Math.floor((NUM_INTERVIEWS - i) * 1.6) + rand(0, 1); // spread over ~5 weeks
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

    const progressBoost = Math.floor((i / NUM_INTERVIEWS) * 20); // trend upward over time
    const baseScore = rand(50, 75) + progressBoost;
    const totalScore = Math.min(98, baseScore);

    const role = pick(ROLES);
    const numQuestions = rand(4, 6);
    const questions = Array.from({ length: numQuestions }, () => pick(SAMPLE_QUESTIONS));
    const answers = buildAnswers(questions);

    const isResumeType = i % 7 === 0; // sprinkle in a few resume-based interviews

    interviews.push({
      user: user._id,
      role: isResumeType ? "resume-based" : role,
      difficulty: isResumeType ? "strict" : pick(DIFFICULTIES),
      interviewType: isResumeType ? "resume" : "standard",
      questions,
      answers,
      totalScore,
      verdict: verdictFor(totalScore),
      aiFeedback: totalScore >= 80
        ? "Overall a strong session — clear communication and solid technical depth. Keep pushing on edge-case reasoning."
        : "Good foundation. Focus on giving more concrete examples and structuring answers with a clear beginning, middle, and end.",
      completed: true,
      proctor: isResumeType ? { violations: 0, flagged: false, log: [] } : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await Interview.insertMany(interviews);
  console.log(`✅ Seeded ${interviews.length} completed interviews`);

  // ── Update streak fields to match the seeded recent activity ──
  const mostRecent = interviews.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  user.currentStreak = rand(3, 8);
  user.longestStreak = Math.max(user.currentStreak, rand(8, 14));
  user.lastInterviewDate = mostRecent.createdAt;
  await user.save();

  console.log("✅ Updated streak data");
  console.log("\n🎉 Done! Set DEMO_LOGIN_ENABLED=true on the server, then use");
  console.log('   the "Try the demo" button on the login page.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});