const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const FriendInterviewRoom = require("../models/FriendInterviewRoom");
const { verifyToken } = require("../utils/jwt");
const { createMemoryStore, createRedisStore } = require("./roomStore");

/**
 * WebRTC signaling + interview-state sync for friend interview rooms.
 *
 * Options:
 *   redis — an ioredis client. When given, the Socket.IO Redis adapter relays
 *           events between API instances and room state lives in Redis, so the
 *           two peers can be connected to DIFFERENT instances.
 *   store — override the room store (tests).
 */
const initSignalingServer = (httpServer, allowedOrigins, { redis = null, store = null } = {}) => {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    path: "/socket.io",
  });

  // Pub/sub connections for the adapter; closed via io.closeRedis() on shutdown.
  const adapterClients = redis ? [redis.duplicate(), redis.duplicate()] : [];
  if (redis) io.adapter(createAdapter(...adapterClients));
  io.closeRedis = () => Promise.all(adapterClients.map((c) => c.quit().catch(() => c.disconnect())));
  const rooms = store || (redis ? createRedisStore(redis) : createMemoryStore());

  // Is this socket id still connected on ANY instance? fetchSockets() goes
  // through the adapter, so it works across instances with Redis.
  const isConnected = async (socketId) =>
    Boolean(socketId) && (await io.in(socketId).fetchSockets()).length > 0;

  // Optional auth: a valid JWT in handshake.auth.token identifies the user.
  // Anonymous sockets are still allowed (guests can join without an account),
  // but role slots tied to an account are checked against it in room:join.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try { socket.data.userId = String(verifyToken(token).id); } catch { /* treat as anonymous */ }
    }
    next();
  });

  io.on("connection", (socket) => {
    let joinedRoom = null;
    let joinedAs   = null;

    // Wraps async handlers so a Redis/DB hiccup never crashes the process.
    const handle = (event, fn) =>
      socket.on(event, async (payload = {}) => {
        try {
          await fn(payload);
        } catch (err) {
          console.error(`${event} error:`, err.message);
          if (event === "room:join") socket.emit("room:error", { message: "Failed to join room" });
        }
      });

    // ── Join room ──
    handle("room:join", async ({ code, as, name }) => {
      const room = await FriendInterviewRoom.findOne({ code: code?.toUpperCase() });
      if (!room) return socket.emit("room:error", { message: "Room not found or has expired" });
      if (room.status === "completed") return socket.emit("room:error", { message: "This interview has already ended" });

      if (as !== "host" && as !== "guest")
        return socket.emit("room:error", { message: "Invalid role" });

      const userId = socket.data.userId || null;
      if (as === "host" && userId !== String(room.host))
        return socket.emit("room:error", { message: "Only the room's host can join as host — please log in" });
      if (as === "guest") {
        if (userId && userId === String(room.host))
          return socket.emit("room:error", { message: "You are the host of this room" });
        if (room.guest && userId !== String(room.guest))
          return socket.emit("room:error", { message: "This room is reserved for another user" });
      }

      // A seat held by a different, still-connected socket is taken. A seat
      // held by a dead socket is free — that's the reconnect case.
      const slots = await rooms.getSlots(room.code);
      if (slots[as] && slots[as] !== socket.id && await isConnected(slots[as])) {
        return socket.emit("room:error", {
          message: as === "guest" ? "Room is already full" : "A host is already in this room",
        });
      }

      await rooms.setSlot(room.code, as, socket.id);
      socket.join(room.code);
      joinedRoom = room.code;
      joinedAs   = as;

      if (as === "guest" && name) {
        room.guestName = String(name).slice(0, 60);
        await room.save();
      }

      const otherRole = as === "host" ? "guest" : "host";
      const peerPresent = await isConnected(slots[otherRole]);
      const state = await rooms.getState(room.code);

      socket.to(room.code).emit("peer:joined", { as, name });
      socket.emit("room:joined", {
        as,
        role:              room.role,
        difficulty:        room.difficulty,
        company:           room.company,
        questions:         room.questions,
        questionsSource:   room.questionsSource,
        hostIsInterviewer: room.hostIsInterviewer,
        peerPresent,
        // Current interview state — crucial for reconnects
        interviewStarted:  state.started,
        interviewEnded:    state.ended,
        questionIndex:     state.questionIndex,
        notes:             state.notes,
      });
    });

    // ── WebRTC signaling — relay only, no server-side logic ──
    for (const event of ["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"]) {
      socket.on(event, (p) => { if (joinedRoom) socket.to(joinedRoom).emit(event, p); });
    }

    // ── Interview state (persisted so reconnects restore state) ──
    handle("interview:start", async () => {
      if (!joinedRoom) return;
      await rooms.patchState(joinedRoom, { started: true });
      socket.to(joinedRoom).emit("interview:start");
    });

    handle("interview:next-question", async ({ index }) => {
      if (!joinedRoom || !Number.isInteger(index) || index < 0) return;
      await rooms.patchState(joinedRoom, { questionIndex: index });
      socket.to(joinedRoom).emit("interview:next-question", { index });
    });

    handle("interview:note", async ({ index, notes, rating }) => {
      if (!joinedRoom || !Number.isInteger(index) || index < 0) return;
      await rooms.setNote(joinedRoom, index, { notes, rating });
      socket.to(joinedRoom).emit("interview:note", { index, notes, rating });
    });

    // State expires shortly after the end (see ENDED_TTL_SECONDS), giving the
    // scorecard event time to reach the other peer first.
    handle("interview:end", async () => {
      if (!joinedRoom) return;
      await rooms.patchState(joinedRoom, { ended: true });
      socket.to(joinedRoom).emit("interview:end");
    });

    socket.on("interview:scorecard", (data) => {
      if (joinedRoom) socket.to(joinedRoom).emit("interview:scorecard", data);
    });

    // ── Chat ──
    socket.on("chat:message", ({ text, from } = {}) => {
      if (joinedRoom) socket.to(joinedRoom).emit("chat:message", { text, from, at: Date.now() });
    });

    // ── Media toggle (mic/cam) ──
    socket.on("media:toggle", ({ kind, enabled } = {}) => {
      if (joinedRoom) socket.to(joinedRoom).emit("media:toggle", { kind, enabled, from: joinedAs });
    });

    // ── Disconnect ──
    socket.on("disconnect", async () => {
      if (!joinedRoom) return;
      const code = joinedRoom;
      socket.to(code).emit("peer:left", { as: joinedAs });
      try {
        // Only frees this socket's own seat — never the other peer's.
        await rooms.clearSlot(code, joinedAs, socket.id);
        const slots = await rooms.getSlots(code);
        if (!slots.host && !slots.guest) {
          // Both peers gone: drop state for rooms that never started. Started
          // rooms keep their state (until it expires) so either peer can rejoin.
          const state = await rooms.getState(code);
          if (!state.started) await rooms.deleteState(code);
        }
      } catch (err) {
        console.error("disconnect cleanup error:", err.message);
      }
    });
  });

  io.roomStore = rooms; // exposed for tests and graceful shutdown
  return io;
};

module.exports = { initSignalingServer };
