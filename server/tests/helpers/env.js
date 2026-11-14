// Loaded by Jest before every test file (see "setupFiles" in package.json).
// Keeps tests hermetic: no real secrets, no real Gemini/email calls.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.CLIENT_URL = "http://localhost:5173";
// Score inline by default, even when CI provides REDIS_URL; the queue tests
// switch this off for themselves (tests/redis.integration.test.js).
process.env.SCORING_MODE = "inline";
