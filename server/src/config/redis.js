const IORedis = require("ioredis");

/**
 * Redis is OPTIONAL. Set REDIS_URL (e.g. redis://localhost:6379, or a hosted
 * rediss:// URL from Upstash / Render Key Value) to turn on:
 *   - the Socket.IO Redis adapter + shared room state (run several API instances)
 *   - the BullMQ background queue for AI scoring (instant submit responses)
 * Without it the app runs exactly as a single instance with in-process scoring.
 */
const isRedisEnabled = () => Boolean(process.env.REDIS_URL);

const clients = new Set();

// BullMQ Workers require maxRetriesPerRequest: null (they block waiting for
// jobs). Every other client fails fast instead, so an unreachable Redis makes
// a command error out (and the caller fall back) rather than hang a request.
const createRedisClient = (name = "app", { blocking = false } = {}) => {
  if (!isRedisEnabled()) throw new Error("REDIS_URL is not set");
  const client = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: blocking ? null : 2,
    connectionName: `ai-interview:${name}`,
  });
  client.on("error", (err) => console.error(`❌ Redis (${name}):`, err.message));
  clients.add(client);
  return client;
};

// Used on shutdown and by tests.
const closeAllRedisClients = async () => {
  await Promise.all([...clients].map((c) => c.quit().catch(() => c.disconnect())));
  clients.clear();
};

module.exports = { isRedisEnabled, createRedisClient, closeAllRedisClients };
