jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));
// OTP emails are never really sent in tests — we control whether a code is valid.
jest.mock("../src/services/otpService", () => ({
  sendOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const { verifyOtp } = require("../src/services/otpService");
const User = require("../src/models/User");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and returns a token", async () => {
    await createUser({ email: "alice@example.com" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("is case-insensitive on email", async () => {
    await createUser({ email: "bob@example.com" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "BOB@Example.com", password: "secret123" });
    expect(res.status).toBe(200);
  });

  it("rejects a wrong password with a generic message", async () => {
    await createUser({ email: "carol@example.com" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "carol@example.com", password: "wrong999" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("gives the same response for an unknown email (no account enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "secret123" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });
});

describe("POST /api/auth/register", () => {
  const body = { name: "Dana", email: "dana@example.com", password: "secret123", otp: "123456" };

  it("creates a verified account when the OTP is valid", async () => {
    verifyOtp.mockResolvedValue({ valid: true });
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: "dana@example.com" });
    expect(user.emailVerified).toBe(true);
    expect(user.password).not.toBe("secret123"); // stored hashed
  });

  it("refuses to create an account with an invalid OTP", async () => {
    verifyOtp.mockResolvedValue({ valid: false, message: "Invalid or expired code" });
    const res = await request(app).post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe("GET /api/auth/me", () => {
  it("requires a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a forged token", async () => {
    const res = await request(app).get("/api/auth/me").set(auth("not-a-real-token"));
    expect(res.status).toBe(401);
  });

  it("returns the current user", async () => {
    const { user, token } = await createUser();
    const res = await request(app).get("/api/auth/me").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
  });
});
