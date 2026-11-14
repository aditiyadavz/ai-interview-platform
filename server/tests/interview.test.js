jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const model = require("../src/config/gemini");
const Interview = require("../src/models/Interview");

beforeAll(db.connect);
beforeEach(() => {
  // Every Gemini call (scoring + session feedback) replies "70".
  model.generateContent.mockResolvedValue({ response: { text: () => "70" } });
});
afterEach(db.clear);
afterAll(db.close);

const QUESTIONS = ["What is a closure in JavaScript?", "Explain the event loop."];

const startInterview = (token) =>
  request(app)
    .post("/api/interview/start")
    .set(auth(token))
    .send({ role: "frontend", difficulty: "medium", questions: QUESTIONS });

describe("interview flow", () => {
  it("starts an interview for the logged-in user", async () => {
    const { user, token } = await createUser();
    const res = await startInterview(token);
    expect(res.status).toBe(201);
    const iv = await Interview.findById(res.body.interviewId);
    expect(String(iv.user)).toBe(String(user._id));
  });

  it("scores on the server and ignores client-sent scores", async () => {
    const { token } = await createUser();
    const { body } = await startInterview(token);

    const res = await request(app)
      .post(`/api/interview/${body.interviewId}/submit`)
      .set(auth(token))
      .send({
        answers: [
          { questionIndex: 0, questionText: QUESTIONS[0], transcript: "A closure keeps access to its outer scope.", score: 100 },
          { questionIndex: 1, questionText: QUESTIONS[1], transcript: "", score: 100 },
        ],
      });

    expect(res.status).toBe(200);
    // 70 from Gemini for the first, 0 for the empty transcript — never the client's 100.
    expect(res.body.totalScore).toBe(35);
    const iv = await Interview.findById(body.interviewId);
    expect(iv.answers.map((a) => a.score)).toEqual([70, 0]);
    expect(iv.completed).toBe(true);
  });

  it("rejects an empty answers array", async () => {
    const { token } = await createUser();
    const { body } = await startInterview(token);
    const res = await request(app)
      .post(`/api/interview/${body.interviewId}/submit`)
      .set(auth(token))
      .send({ answers: [] });
    expect(res.status).toBe(400);
  });

  it("refuses a second submission", async () => {
    const { token } = await createUser();
    const { body } = await startInterview(token);
    const answers = [{ questionIndex: 0, questionText: QUESTIONS[0], transcript: "Some real answer text" }];
    await request(app).post(`/api/interview/${body.interviewId}/submit`).set(auth(token)).send({ answers });
    const res = await request(app).post(`/api/interview/${body.interviewId}/submit`).set(auth(token)).send({ answers });
    expect(res.status).toBe(400);
  });

  it("does not let one user submit or read another user's interview", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const { body } = await startInterview(owner.token);

    const submit = await request(app)
      .post(`/api/interview/${body.interviewId}/submit`)
      .set(auth(intruder.token))
      .send({ answers: [{ questionIndex: 0, questionText: QUESTIONS[0], transcript: "hijack attempt" }] });
    expect(submit.status).toBe(404);

    const read = await request(app).get(`/api/interview/${body.interviewId}`).set(auth(intruder.token));
    expect(read.status).toBe(404);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/interview/start").send({ role: "frontend", questions: QUESTIONS });
    expect(res.status).toBe(401);
  });
});
