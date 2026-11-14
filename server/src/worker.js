/**
 * Standalone AI-scoring worker: `npm run worker`.
 *
 * Optional — by default the API process runs the worker itself. Run this as
 * a separate service (and set RUN_WORKER=false on the API) to scale scoring
 * independently of web traffic. Requires REDIS_URL.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { isQueueEnabled, startScoringWorker } = require("./services/scoringQueue");
const { closeAllRedisClients } = require("./config/redis");

if (!isQueueEnabled()) {
  console.error("❌ The scoring worker needs REDIS_URL (and SCORING_MODE not set to 'inline').");
  process.exit(1);
}

connectDB();
const worker = startScoringWorker();
console.log("🧮 Scoring worker started");

const shutdown = async () => {
  await worker.close();          // finishes the job in progress first
  await closeAllRedisClients();
  await mongoose.disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
