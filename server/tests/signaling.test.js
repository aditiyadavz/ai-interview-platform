const http = require("http");
const { io: connectClient } = require("socket.io-client");
const db = require("./helpers/db");
const { createUser } = require("./helpers/factories");
const { initSignalingServer } = require("../src/sockets/signalingServer");
const FriendInterviewRoom = require("../src/models/FriendInterviewRoom");

let httpServer, io, url;
const clients = [];

beforeAll(async () => {
  await db.connect();
  httpServer = http.createServer();
  io = initSignalingServer(httpServer, ["http://localhost:5173"]);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${httpServer.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  await db.clear();
});

afterAll(async () => {
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await db.close();
});

// Connects, emits room:join, and resolves with whichever reply arrives first.
const join = (payload, token) =>
  new Promise((resolve, reject) => {
    const socket = connectClient(url, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: token ? { token } : {},
      forceNew: true,
    });
    clients.push(socket);
    socket.on("connect", () => socket.emit("room:join", payload));
    socket.on("room:joined", (data) => resolve({ ok: true, data }));
    socket.on("room:error", (err) => resolve({ ok: false, message: err.message }));
    socket.on("connect_error", reject);
  });

const createRoom = (host, overrides = {}) =>
  FriendInterviewRoom.create({
    code: "ROOM42",
    host: host._id,
    hostName: host.name,
    questions: ["Q1 question text"],
    ...overrides,
  });

describe("room:join", () => {
  it("lets the real host join as host", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await join({ code: "ROOM42", as: "host" }, host.token);
    expect(res.ok).toBe(true);
  });

  it("rejects an anonymous socket claiming to be host", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await join({ code: "ROOM42", as: "host" });
    expect(res.ok).toBe(false);
  });

  it("rejects another logged-in user claiming to be host", async () => {
    const host = await createUser();
    const other = await createUser();
    await createRoom(host.user);
    const res = await join({ code: "ROOM42", as: "host" }, other.token);
    expect(res.ok).toBe(false);
  });

  it("allows an anonymous guest into an open room", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await join({ code: "ROOM42", as: "guest", name: "Sam" });
    expect(res.ok).toBe(true);
  });

  it("reserves the guest slot for the registered guest", async () => {
    const host = await createUser();
    const guest = await createUser();
    const other = await createUser();
    await createRoom(host.user, { guest: guest.user._id });

    expect((await join({ code: "ROOM42", as: "guest" }, other.token)).ok).toBe(false);
    expect((await join({ code: "ROOM42", as: "guest" })).ok).toBe(false);
    expect((await join({ code: "ROOM42", as: "guest" }, guest.token)).ok).toBe(true);
  });

  it("rejects an unknown role", async () => {
    const host = await createUser();
    await createRoom(host.user);
    const res = await join({ code: "ROOM42", as: "admin" }, host.token);
    expect(res.ok).toBe(false);
  });

  it("rejects a room that does not exist", async () => {
    const host = await createUser();
    const res = await join({ code: "NOPE00", as: "host" }, host.token);
    expect(res).toEqual({ ok: false, message: "Room not found or has expired" });
  });
});
