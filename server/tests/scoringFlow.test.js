jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const model = require("../src/config/gemini");
const Interview = require("../src/models/Interview");
const User = require("../src/models/User");
const { finalizeInterview, claimForScoring, STALE_PENDING_MS } = require("../src/services/interviewFinalizer");

beforeAll(db.connect);
beforeEach(() => {
  model.generateContent.mockResolvedValue({ response: { text: () => "80" } });
});
afterEach(async () => {
  jest.restoreAllMocks();
  await db.clear();
});
afterAll(db.close);

const QUESTIONS = ["What is a closure in JavaScript?", "Explain the event loop."];
const ANSWERS = QUESTIONS.map((q, i) => ({
  questionIndex: i, questionText: q, transcript: "A reasonably detailed answer to the question.",
}));

const start = async (token) =>
  (await request(app).post("/api/interview/start").set(auth(token))
    .send({ role: "frontend", questions: QUESTIONS })).body.interviewId;

const submit = (id, token, answers = ANSWERS) =>
  request(app).post(`/api/interview/${id}/submit`).set(auth(token)).send({ answers });

const result = (id, token) => request(app).get(`/api/interview/${id}/result`).set(auth(token));

describe("GET /api/interview/:id/result", () => {
  it("reports not_submitted, then done with the score after an inline submit", async () => {
    const { token } = await createUser();
    const id = await start(token);

    expect((await result(id, token)).body.status).toBe("not_submitted");

    const sub = await submit(id, token);
    expect(sub.status).toBe(200);
    expect(sub.body).toMatchObject({ status: "done", totalScore: 80, verdict: "Good" });

    expect((await result(id, token)).body).toMatchObject({ status: "done", totalScore: 80 });
  });

  it("is private to the interview's owner", async () => {
    const owner = await createUser();
    const other = await createUser();
    const id = await start(owner.token);
    expect((await result(id, other.token)).status).toBe(404);
  });

  it("rejects a malformed id", async () => {
    const { token } = await createUser();
    expect((await result("not-an-id", token)).status).toBe(400);
  });
});

describe("submit is safe against double submission", () => {
  it("scores and counts the streak only once when two submits race", async () => {
    const { user, token } = await createUser();
    const id = await start(token);

    const [a, b] = await Promise.all([submit(id, token), submit(id, token)]);
    const statuses = [a.status, b.status].sort();

    expect(statuses[0]).toBe(200);
    expect([400, 409]).toContain(statuses[1]);
    expect((await User.findById(user._id)).currentStreak).toBe(1);
  });

  it("lets the user submit again after scoring failed", async () => {
    const { token } = await createUser();
    const id = await start(token);

    jest.spyOn(Interview.prototype, "save").mockRejectedValueOnce(new Error("DB hiccup"));
    const first = await submit(id, token);
    expect(first.status).toBe(500);
    expect((await result(id, token)).body.status).toBe("failed");

    const retry = await submit(id, token);
    expect(retry.status).toBe(200);
    expect(retry.body.status).toBe("done");
  });

  it("allows resubmitting an interview stuck in pending (e.g. server restarted)", async () => {
    const { user, token } = await createUser();
    const id = await start(token);
    await Interview.updateOne({ _id: id }, {
      $set: { "scoring.status": "pending", "scoring.startedAt": new Date(Date.now() - STALE_PENDING_MS - 1000) },
    });

    const claimed = await claimForScoring({ interviewId: id, userId: user._id, answers: ANSWERS });
    expect(claimed).not.toBeNull();
  });

  it("does not let a fresh pending claim be taken twice", async () => {
    const { user, token } = await createUser();
    const id = await start(token);
    const first = await claimForScoring({ interviewId: id, userId: user._id, answers: ANSWERS });
    const second = await claimForScoring({ interviewId: id, userId: user._id, answers: ANSWERS });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});

describe("finalizeInterview", () => {
  it("is idempotent — a retried job doesn't rescore or double-count the streak", async () => {
    const { user, token } = await createUser();
    const id = await start(token);
    await claimForScoring({ interviewId: id, userId: user._id, answers: ANSWERS });

    const first = await finalizeInterview(id);
    const callsAfterFirst = model.generateContent.mock.calls.length;
    const second = await finalizeInterview(id);

    expect(second).toMatchObject({ status: "done", totalScore: first.totalScore });
    expect(model.generateContent.mock.calls.length).toBe(callsAfterFirst); // no new Gemini calls
    expect((await User.findById(user._id)).currentStreak).toBe(1);
  });
});

describe("resume interview submit", () => {
  it("uses the shared flow and stores the proctoring summary", async () => {
    const { user, token } = await createUser();
    const iv = await Interview.create({
      user: user._id, role: "resume-based", interviewType: "resume", questions: QUESTIONS,
    });

    const res = await request(app)
      .post(`/api/resume-interview/${iv._id}/submit`)
      .set(auth(token))
      .send({ answers: ANSWERS, proctor: { violations: 3, log: ["tab switch"] } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "done", totalScore: 80 });
    expect(res.body.proctor).toMatchObject({ violations: 3, flagged: true });
  });
});
