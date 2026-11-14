jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));
jest.mock("../src/services/otpService", () => ({
  sendOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue({ valid: true }),
}));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const { sendOtp } = require("../src/services/otpService");
const User = require("../src/models/User");
const Interview = require("../src/models/Interview");

beforeAll(db.connect);
beforeEach(() => {
  process.env.DEMO_LOGIN_ENABLED = "true";
  jest.clearAllMocks();
});
afterEach(db.clear);
afterAll(db.close);

const createDemo = () => createUser({ email: "demo@aiinterview.dev", isDemo: true });

describe("POST /api/auth/demo", () => {
  it("logs in to the demo account without a password", async () => {
    const { user } = await createDemo();
    const res = await request(app).post("/api/auth/demo");
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: user.email, isDemo: true });

    const me = await request(app).get("/api/auth/me").set(auth(res.body.token));
    expect(me.body.isDemo).toBe(true);
  });

  it("is off unless DEMO_LOGIN_ENABLED=true", async () => {
    await createDemo();
    delete process.env.DEMO_LOGIN_ENABLED;
    const res = await request(app).post("/api/auth/demo");
    expect(res.status).toBe(404);
  });

  it("never logs in to a normal account", async () => {
    await createUser(); // regular user only, no demo account
    const res = await request(app).post("/api/auth/demo");
    expect(res.status).toBe(503);
    expect(res.body.token).toBeUndefined();
  });
});

describe("demo account is protected", () => {
  it("cannot change its password", async () => {
    const { token } = await createDemo();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth(token))
      .send({ currentPassword: "secret123", newPassword: "hijack123" });
    expect(res.status).toBe(403);
  });

  it("cannot be taken over through password reset", async () => {
    await createDemo();
    await request(app).post("/api/auth/forgot-password").send({ email: "demo@aiinterview.dev" });
    expect(sendOtp).not.toHaveBeenCalled();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ email: "demo@aiinterview.dev", otp: "123456", newPassword: "hijack123" });
    expect(res.status).toBe(400);
  });

  it("cannot edit the shared profile", async () => {
    const { token } = await createDemo();
    const res = await request(app).put("/api/user/profile").set(auth(token)).send({ name: "Hacked" });
    expect(res.status).toBe(403);
    expect((await User.findOne({ isDemo: true })).name).not.toBe("Hacked");
  });

  it("cannot upload a resume", async () => {
    const { token } = await createDemo();
    const res = await request(app).post("/api/upload/resume").set(auth(token));
    expect(res.status).toBe(403);
  });

  it("cannot post a testimonial", async () => {
    const { token } = await createDemo();
    const res = await request(app)
      .post("/api/testimonials")
      .set(auth(token))
      .send({ text: "Best app ever!", rating: 5 });
    expect(res.status).toBe(403);
  });

  it("can still practise interviews", async () => {
    const { token } = await createDemo();
    const res = await request(app)
      .post("/api/interview/start")
      .set(auth(token))
      .send({ role: "frontend", questions: ["What is a closure in JavaScript?"] });
    expect(res.status).toBe(201);
  });

  it("does not block normal users", async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(auth(token))
      .send({ currentPassword: "secret123", newPassword: "newpass456" });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/stats", () => {
  it("excludes the demo account and its sample interviews", async () => {
    const demo = await createDemo();
    const real = await createUser();
    const interview = (user) => ({
      user: user._id, role: "frontend", questions: ["Q"], completed: true,
      answers: [{ questionIndex: 0, questionText: "Q", score: 80 }],
    });
    await Interview.create([interview(demo.user), interview(demo.user), interview(real.user)]);

    const res = await request(app).get("/api/stats");
    expect(res.body).toEqual({ users: 1, interviews: 1, questionsAnswered: 1 });
  });
});
