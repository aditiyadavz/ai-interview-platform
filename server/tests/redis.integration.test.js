/**
 * Integration tests against a REAL Redis. CI runs a Redis service and sets
 * REDIS_URL; locally they're skipped unless you set it, e.g.
 *   REDIS_URL=redis://localhost:6379 npm test
 */
jest.mock("../src/config/gemini", () => ({ generateContent: jest.fn() }));

const http = require("http");
const IORedis = require("ioredis");
const request = require("supertest");
const { io: connectClient } = require("socket.io-client");
const { Queue } = require("bullmq");

const run = process.env.REDIS_URL ? describe : describe.skip;

run("with Redis", () => {
  const app = require("../src/app");
  const db = require("./helpers/db");
  const { createUser, auth } = require("./helpers/factories");
  const model = require("../src/config/gemini");
  const FriendInterviewRoom = require("../src/models/FriendInterviewRoom");
  const { initSignalingServer } = require("../src/sockets/signalingServer");
  const { startScoringWorker, closeQueue, enqueueScoring, QUEUE_NAME } = require("../src/services/scoringQueue");
  const { closeAllRedisClients } = require("../src/config/redis");
  const { acquireWeeklyLock } = require("../src/services/reminderScheduler");

  let redis;

  beforeAll(async () => {
    await db.connect();
    redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    await redis.flushdb(); // CI's Redis is dedicated to tests
  });

  afterAll(async () => {
    await closeQueue();
    await closeAllRedisClients();
    await redis.quit();
    await db.close();
  });

  /* ── Background scoring queue ───────────────────────────────────────────── */
  describe("BullMQ scoring queue", () => {
    let worker;

    beforeAll(() => {
      process.env.SCORING_MODE = "queue";
      worker = startScoringWorker({ concurrency: 1 });
    });
    afterAll(async () => {
      await worker.close();
      process.env.SCORING_MODE = "inline";
    });
    beforeEach(() => {
      model.generateContent.mockResolvedValue({ response: { text: () => "90" } });
    });

    const QUESTIONS = ["What is a closure in JavaScript?", "Explain the event loop."];

    const pollResult = async (id, token, timeoutMs = 20000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const res = await request(app).get(`/api/interview/${id}/result`).set(auth(token));
        if (res.body.status !== "pending") return res.body;
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error("timed out waiting for the scoring job");
    };

    it("returns 202 immediately and the worker scores the interview", async () => {
      const { token } = await createUser();
      const { body } = await request(app).post("/api/interview/start").set(auth(token))
        .send({ role: "frontend", questions: QUESTIONS });

      const submit = await request(app)
        .post(`/api/interview/${body.interviewId}/submit`)
        .set(auth(token))
        .send({ answers: QUESTIONS.map((q, i) => ({ questionIndex: i, questionText: q, transcript: "A detailed answer here." })) });

      expect(submit.status).toBe(202);
      expect(submit.body).toMatchObject({ status: "pending", interviewId: body.interviewId });

      const result = await pollResult(body.interviewId, token);
      expect(result).toMatchObject({ status: "done", totalScore: 90, verdict: "Excellent" });
    });

    it("never queues the same interview twice", async () => {
      const id = "64b000000000000000000001";
      const q = new Queue(QUEUE_NAME, { connection: redis });
      await q.pause(); // keep the jobs waiting so we can count them
      try {
        await enqueueScoring(id);
        await enqueueScoring(id);
        const jobs = await q.getJobs(["waiting", "paused", "active", "delayed"]);
        expect(jobs.filter((j) => j.id === id)).toHaveLength(1);
        await (await q.getJob(id)).remove();
      } finally {
        await q.resume();
        await q.close();
      }
    });
  });

  /* ── Socket.IO across two instances ─────────────────────────────────────── */
  describe("Socket.IO Redis adapter", () => {
    const servers = [];
    const clients = [];

    const startInstance = async () => {
      const httpServer = http.createServer();
      const io = initSignalingServer(httpServer, ["http://localhost:5173"], { redis });
      await new Promise((r) => httpServer.listen(0, r));
      servers.push({ httpServer, io });
      return `http://localhost:${httpServer.address().port}`;
    };

    const connect = (url, token) => {
      const socket = connectClient(url, {
        path: "/socket.io", transports: ["websocket"], forceNew: true, auth: token ? { token } : {},
      });
      clients.push(socket);
      return socket;
    };

    const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

    const join = async (socket, payload) => {
      if (!socket.connected) await once(socket, "connect");
      socket.emit("room:join", payload);
      return Promise.race([
        once(socket, "room:joined").then((d) => ({ ok: true, ...d })),
        once(socket, "room:error").then((e) => ({ ok: false, ...e })),
      ]);
    };

    afterAll(async () => {
      clients.forEach((c) => c.disconnect());
      for (const { io, httpServer } of servers) {
        io.close();
        await io.closeRedis();
        await new Promise((r) => httpServer.close(r));
      }
    });

    it("connects two peers on different instances and relays signaling between them", async () => {
      const [urlA, urlB] = [await startInstance(), await startInstance()];
      const host = await createUser();
      await FriendInterviewRoom.create({
        code: "XINST1", host: host.user._id, hostName: host.user.name, questions: ["Q1 question"],
      });

      const hostSocket = connect(urlA, host.token);
      const hostJoin = await join(hostSocket, { code: "XINST1", as: "host" });
      expect(hostJoin.ok).toBe(true);
      expect(hostJoin.peerPresent).toBe(false);

      const peerJoined = once(hostSocket, "peer:joined");
      const guestSocket = connect(urlB);                 // a DIFFERENT instance
      const guestJoin = await join(guestSocket, { code: "XINST1", as: "guest", name: "Sam" });
      expect(guestJoin.ok).toBe(true);
      expect(guestJoin.peerPresent).toBe(true);          // sees the host on instance A
      expect(await peerJoined).toMatchObject({ as: "guest" });

      const offer = once(guestSocket, "webrtc:offer");
      hostSocket.emit("webrtc:offer", { sdp: "fake-offer" });
      expect(await offer).toEqual({ sdp: "fake-offer" });

      // Interview state written on instance A is visible to a reconnect on B.
      const started = once(guestSocket, "interview:start");
      hostSocket.emit("interview:start");
      await started;
      guestSocket.disconnect();
      const rejoin = await join(connect(urlB), { code: "XINST1", as: "guest" });
      expect(rejoin).toMatchObject({ ok: true, interviewStarted: true });

      // The guest seat is now held by a live socket on B, so a third
      // connection on A is refused.
      const third = await join(connect(urlA), { code: "XINST1", as: "guest" });
      expect(third).toMatchObject({ ok: false, message: "Room is already full" });
    });
  });

  /* ── Weekly reminder cron lock ──────────────────────────────────────────── */
  describe("weekly reminder lock", () => {
    it("lets only one instance send each week's reminders", async () => {
      const monday = new Date("2026-11-16T09:00:00Z");
      expect(await acquireWeeklyLock(redis, monday)).toBe(true);
      expect(await acquireWeeklyLock(redis, monday)).toBe(false);
      expect(await acquireWeeklyLock(redis, new Date("2026-11-23T09:00:00Z"))).toBe(true);
    });

    it("always allows a single instance without Redis", async () => {
      expect(await acquireWeeklyLock(null)).toBe(true);
    });
  });
});
