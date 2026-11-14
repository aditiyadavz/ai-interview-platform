jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { createUser, auth } = require("./helpers/factories");
const Interview = require("../src/models/Interview");
const FriendInterviewRoom = require("../src/models/FriendInterviewRoom");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

const verdictFor = (s) => (s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Average" : "Needs Work");

// insertMany skips the save hook, so totalScore/verdict are stored exactly as given.
const addInterviews = (user, scores, extra = {}) =>
  Interview.insertMany(
    scores.map((totalScore) => ({
      user: user._id, role: "frontend", questions: ["Q"], completed: true,
      totalScore, verdict: verdictFor(totalScore), ...extra,
    }))
  );

const getBoard = (token) => request(app).get("/api/achievements/leaderboard").set(auth(token));

describe("GET /api/achievements/leaderboard", () => {
  it("requires login", async () => {
    const res = await request(app).get("/api/achievements/leaderboard");
    expect(res.status).toBe(401);
  });

  it("returns an empty board when nobody has interviewed", async () => {
    const { token } = await createUser();
    const res = await getBoard(token);
    expect(res.body).toEqual({ leaderboard: [], currentUserEntry: null, total: 0 });
  });

  it("ranks users by performance and marks the current user", async () => {
    const strong = await createUser({ name: "Strong" });
    const weak = await createUser({ name: "Weak" });
    await addInterviews(strong.user, [90, 88]);
    await addInterviews(weak.user, [40, 45]);

    const res = await getBoard(weak.token);

    expect(res.body.leaderboard.map((u) => u.name)).toEqual(["Strong", "Weak"]);
    expect(res.body.leaderboard[0]).toMatchObject({ rank: 1, avgScore: 89, bestScore: 90, totalSessions: 2 });
    expect(res.body.currentUserEntry).toMatchObject({ name: "Weak", rank: 2, isCurrentUser: true });
    expect(res.body.total).toBe(2);
  });

  it("ignores interviews that are not completed", async () => {
    const a = await createUser();
    await addInterviews(a.user, [95], { completed: false });
    const res = await getBoard(a.token);
    expect(res.body.total).toBe(0);
  });

  it("never ranks the demo account", async () => {
    const demo = await createUser({ name: "Demo", isDemo: true });
    const real = await createUser({ name: "Real" });
    await addInterviews(demo.user, Array(22).fill(95));
    await addInterviews(real.user, [60]);

    const res = await getBoard(real.token);
    expect(res.body.leaderboard.map((u) => u.name)).toEqual(["Real"]);
  });

  it("excludes friend-room interviews, which can't be farmed for a fixed 100", async () => {
    const farmer = await createUser({ name: "Farmer" });
    const honest = await createUser({ name: "Honest" });
    await addInterviews(farmer.user, Array(10).fill(100), { interviewType: "friend" });
    // Legacy friend interviews created before interviewType "friend" existed
    await addInterviews(farmer.user, Array(10).fill(100), {
      aiFeedback: "Friend interview session. You were the interviewer. You conducted the session.",
    });
    await addInterviews(honest.user, [70]);

    const res = await getBoard(honest.token);
    expect(res.body.leaderboard.map((u) => u.name)).toEqual(["Honest"]);
  });

  it("caps the reward for sheer session volume", async () => {
    const spammer = await createUser({ name: "Spammer" });
    const skilled = await createUser({ name: "Skilled" });
    await addInterviews(spammer.user, Array(200).fill(50)); // lots of mediocre sessions
    await addInterviews(skilled.user, Array(20).fill(90));

    const res = await getBoard(skilled.token);
    expect(res.body.leaderboard[0].name).toBe("Skilled");
    expect(res.body.leaderboard[1].totalSessions).toBe(200); // still shown, just not over-rewarded
  });
});

describe("friend rooms record a friend interview type", () => {
  it("tags both participants' interviews as interviewType 'friend'", async () => {
    const host = await createUser();
    const guest = await createUser();
    await FriendInterviewRoom.create({
      code: "LB1234", host: host.user._id, hostName: host.user.name, guest: guest.user._id,
      questions: ["Tell me about yourself."], hostIsInterviewer: true, status: "active",
    });

    await request(app)
      .post("/api/friend-room/LB1234/finish")
      .set(auth(host.token))
      .send({ candidateAnswers: [{ rating: 4 }] });

    const types = await Interview.find().distinct("interviewType");
    expect(types).toEqual(["friend"]);
  });
});
