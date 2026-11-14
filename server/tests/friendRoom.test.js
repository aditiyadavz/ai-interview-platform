jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const FriendInterviewRoom = require("../src/models/FriendInterviewRoom");
const Interview = require("../src/models/Interview");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const QUESTIONS = ["Tell me about yourself.", "Describe a hard bug you fixed."];

const createRoom = (host, overrides = {}) =>
  FriendInterviewRoom.create({
    code: "ABC123",
    host: host._id,
    hostName: host.name,
    questions: QUESTIONS,
    hostIsInterviewer: true,
    status: "active",
    ...overrides,
  });

const finish = (body, token) => {
  const req = request(app).post("/api/friend-room/ABC123/finish");
  if (token) req.set(auth(token));
  return req.send(body);
};

const ratings = (...r) => r.map((rating, i) => ({ questionIndex: i, notes: "ok", rating }));

describe("POST /api/friend-room/:code/finish", () => {
  it("lets the host finish and records interviews for host and guest", async () => {
    const host = await createUser();
    const guest = await createUser();
    await createRoom(host.user, { guest: guest.user._id });

    const res = await finish({ candidateAnswers: ratings(5, 3) }, host.token);

    expect(res.status).toBe(200);
    expect(res.body.candidateScore).toBe(80); // avg 4/5
    expect(await Interview.countDocuments({ user: host.user._id })).toBe(1);
    expect(await Interview.countDocuments({ user: guest.user._id })).toBe(1);
  });

  it("rejects a logged-in stranger", async () => {
    const host = await createUser();
    const guest = await createUser();
    const stranger = await createUser();
    await createRoom(host.user, { guest: guest.user._id });

    const res = await finish({ candidateAnswers: ratings(5, 5) }, stranger.token);
    expect(res.status).toBe(403);
    expect(await Interview.countDocuments()).toBe(0);
  });

  it("rejects an anonymous caller when the host is the interviewer", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await finish({ candidateAnswers: ratings(5, 5) });
    expect(res.status).toBe(401);
  });

  it("ignores a client-sent guestUserId (cannot create history for another user)", async () => {
    const host = await createUser();
    const victim = await createUser();
    await createRoom(host.user);

    await finish({ candidateAnswers: ratings(1, 1), guestUserId: String(victim.user._id) }, host.token);
    expect(await Interview.countDocuments({ user: victim.user._id })).toBe(0);
  });

  it("clamps out-of-range ratings to 5", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await finish({ candidateAnswers: ratings(50, 999) }, host.token);
    expect(res.body.candidateScore).toBe(100);
  });

  it("returns the stored result instead of finishing twice", async () => {
    const host = await createUser();
    await createRoom(host.user);
    await finish({ candidateAnswers: ratings(4, 4) }, host.token);
    const res = await finish({ candidateAnswers: ratings(1, 1) }, host.token);
    expect(res.body.message).toBe("Already completed");
    expect(res.body.candidateScore).toBe(80);
    expect(await Interview.countDocuments({ user: host.user._id })).toBe(1);
  });
});

describe("POST /api/friend-room/:code/join", () => {
  it("does not let the host claim the guest slot", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await request(app).post("/api/friend-room/ABC123/join").set(auth(host.token));
    expect(res.status).toBe(400);
  });

  it("does not let a second user take an occupied guest slot", async () => {
    const host = await createUser();
    const guest = await createUser();
    const other = await createUser();
    await createRoom(host.user, { guest: guest.user._id });
    const res = await request(app).post("/api/friend-room/ABC123/join").set(auth(other.token));
    expect(res.status).toBe(403);
  });
});
