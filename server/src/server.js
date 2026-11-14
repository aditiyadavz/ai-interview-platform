const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const { isRedisEnabled, createRedisClient, closeAllRedisClients } = require("./config/redis");
const { initSignalingServer }  = require("./sockets/signalingServer");
const { initReminderScheduler } = require("./services/reminderScheduler");
const { isQueueEnabled, startScoringWorker, closeQueue } = require("./services/scoringQueue");

connectDB();

// Optional Redis: shared socket state across instances, background scoring,
// and a single sender for the weekly reminder cron. See config/redis.js.
const redis = isRedisEnabled() ? createRedisClient("app") : null;

initReminderScheduler({ redis });

// The worker runs inside the API process by default. Set RUN_WORKER=false
// on API instances if you run `npm run worker` as a separate service.
const worker = isQueueEnabled() && process.env.RUN_WORKER !== "false" ? startScoringWorker() : null;

const PORT = Number(process.env.PORT) || 5000;

const httpServer = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const io = initSignalingServer(httpServer, allowedOrigins, { redis });

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 MongoDB connecting...`);
  console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing key"}`);
  console.log(`📹 Signaling: ${redis ? "Redis adapter (multi-instance)" : "in-memory (single instance)"}`);
  console.log(`🧮 AI scoring: ${isQueueEnabled() ? `background queue${worker ? " + worker in this process" : ""}` : "inline"}`);
  console.log(`📧 Email reminders: ${process.env.EMAIL_USER ? "✅ Configured" : "⚠️  EMAIL_USER not set"}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`⚠️  Port ${PORT} in use — retrying on ${PORT + 1}`);
    server.listen(PORT + 1);
  }
});

// Graceful shutdown (Render/Docker send SIGTERM on deploy): stop taking new
// requests, let the worker finish its current job, then close connections.
let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully`);
  const force = setTimeout(() => process.exit(1), 25_000);
  force.unref();
  try {
    io.close();
    await io.closeRedis();
    await new Promise((resolve) => server.close(resolve));
    if (worker) await worker.close();
    await closeQueue();
    await closeAllRedisClients();
    await mongoose.disconnect();
  } catch (err) {
    console.error("Shutdown error:", err.message);
  }
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
