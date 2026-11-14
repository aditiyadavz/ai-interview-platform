/**
 * Background AI scoring with BullMQ.
 *
 * Scoring one interview makes one Gemini call per answer plus one for
 * feedback — often 10–30 s. With REDIS_URL set, submit saves the answers,
 * queues a job and returns immediately; a worker scores it and the client
 * polls GET /api/interview/:id/result. Jobs retry with backoff, and the job
 * id is the interview id, so the same interview can never be queued twice.
 *
 * Without REDIS_URL, submit falls back to scoring inline (the old behaviour).
 */
const { Queue, Worker } = require("bullmq");
const { isRedisEnabled, createRedisClient } = require("../config/redis");
const { finalizeInterview, markScoringFailed } = require("./interviewFinalizer");

const QUEUE_NAME = "interview-scoring";
const ATTEMPTS = 3;

let queue = null;

const getQueue = () => {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: createRedisClient("queue"),
      defaultJobOptions: {
        attempts: ATTEMPTS,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return queue;
};

const isQueueEnabled = () => isRedisEnabled() && process.env.SCORING_MODE !== "inline";

const ENQUEUE_TIMEOUT_MS = 3000;

const withTimeout = (promise, ms, message) => {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const enqueue = async (id) => {
  // A finished/failed job with this id would block re-adding it (e.g. after
  // "failed" the user submits again), so clear it first. No-op otherwise.
  const existing = await getQueue().getJob(id);
  if (existing && (await existing.isCompleted() || await existing.isFailed())) await existing.remove();
  await getQueue().add("score", { interviewId: id }, { jobId: id });
};

// Rejects within a few seconds if Redis is unreachable, so the submit handler
// can fall back to inline scoring instead of leaving the user waiting.
const enqueueScoring = (interviewId) =>
  withTimeout(enqueue(String(interviewId)), ENQUEUE_TIMEOUT_MS, "Timed out queueing scoring job");

const startScoringWorker = ({ concurrency = Number(process.env.SCORING_CONCURRENCY) || 2 } = {}) => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => finalizeInterview(job.data.interviewId),
    { connection: createRedisClient("worker", { blocking: true }), concurrency }
  );

  worker.on("failed", async (job, err) => {
    console.error(`⚠️  Scoring job ${job?.id} failed (attempt ${job?.attemptsMade}/${ATTEMPTS}):`, err.message);
    if (job && job.attemptsMade >= ATTEMPTS) {
      await markScoringFailed(job.data.interviewId, err).catch(() => {});
    }
  });
  worker.on("error", (err) => console.error("❌ Scoring worker error:", err.message));

  return worker;
};

const closeQueue = async () => {
  if (queue) await queue.close();
  queue = null;
};

module.exports = { isQueueEnabled, enqueueScoring, startScoringWorker, closeQueue, QUEUE_NAME };
