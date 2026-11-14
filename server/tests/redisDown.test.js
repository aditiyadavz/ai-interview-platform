/**
 * If REDIS_URL is configured but Redis is unreachable, submitting must still
 * work: queueing times out and the server scores inline instead of hanging.
 * Runs without a real Redis (it points at a closed port on purpose).
 */
jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const request = require("supertest");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");

let app, model, closeQueue, closeAllRedisClients;
const saved = { url: process.env.REDIS_URL, mode: process.env.SCORING_MODE };

beforeAll(async () => {
  process.env.REDIS_URL = "redis://127.0.0.1:1"; // nothing listens here
  process.env.SCORING_MODE = "queue";
  app = require("../src/app");
  model = require("../src/config/gemini");
  ({ closeQueue } = require("../src/services/scoringQueue"));
  ({ closeAllRedisClients } = require("../src/config/redis"));
  await db.connect();
});

afterAll(async () => {
  await closeQueue().catch(() => {});
  await closeAllRedisClients();
  await db.close();
  process.env.REDIS_URL = saved.url;
  if (saved.url === undefined) delete process.env.REDIS_URL;
  process.env.SCORING_MODE = saved.mode;
});

it("falls back to inline scoring when Redis is unreachable", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {}); // expected connection errors
  model.generateContent.mockResolvedValue({ response: { text: () => "75" } });

  const { token } = await createUser();
  const questions = ["What is a closure in JavaScript?"];
  const { body } = await request(app).post("/api/interview/start").set(auth(token))
    .send({ role: "frontend", questions });

  const startedAt = Date.now();
  const res = await request(app)
    .post(`/api/interview/${body.interviewId}/submit`)
    .set(auth(token))
    .send({ answers: [{ questionIndex: 0, questionText: questions[0], transcript: "A closure keeps its scope." }] });

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ status: "done", totalScore: 75 });
  expect(Date.now() - startedAt).toBeLessThan(10_000);
}, 20_000);
