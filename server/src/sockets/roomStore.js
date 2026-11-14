/**
 * Live state for friend-interview rooms, behind one async interface so the
 * signaling server works the same on one instance (memory) or many (Redis).
 *
 *   slots — which socket currently holds the "host" / "guest" seat
 *   state — interview progress: started, ended, questionIndex, notes per question
 *
 * State is kept so a peer who refreshes or reconnects resumes where they were.
 */

const ROOM_TTL_SECONDS = 24 * 60 * 60;   // abandoned rooms clean themselves up
const ENDED_TTL_SECONDS = 60;            // keep state briefly after the end so the scorecard can sync

const emptyState = () => ({ started: false, ended: false, questionIndex: 0, notes: {} });

/* ── In-memory (single instance, default) ─────────────────────────────────── */
const createMemoryStore = () => {
  const slots = new Map();   // code -> { host, guest }
  const states = new Map();  // code -> state
  const timers = new Map();  // code -> cleanup timeout

  const schedule = (code, seconds) => {
    clearTimeout(timers.get(code));
    const t = setTimeout(() => {
      slots.delete(code);
      states.delete(code);
      timers.delete(code);
    }, seconds * 1000);
    t.unref?.(); // never keep the process alive just for cleanup
    timers.set(code, t);
  };

  const state = (code) => {
    if (!states.has(code)) states.set(code, emptyState());
    return states.get(code);
  };

  return {
    kind: "memory",
    async getSlots(code) { return { ...(slots.get(code) || {}) }; },
    async setSlot(code, role, socketId) {
      slots.set(code, { ...(slots.get(code) || {}), [role]: socketId });
      schedule(code, ROOM_TTL_SECONDS);
    },
    async clearSlot(code, role, socketId) {
      const s = slots.get(code);
      if (s && s[role] === socketId) delete s[role];
      if (s && !s.host && !s.guest) slots.delete(code);
    },
    async getState(code) {
      const s = states.get(code) || emptyState();
      return { ...s, notes: { ...s.notes } };
    },
    async patchState(code, fields) {
      Object.assign(state(code), fields);
      schedule(code, fields.ended ? ENDED_TTL_SECONDS : ROOM_TTL_SECONDS);
    },
    async setNote(code, index, note) {
      state(code).notes[index] = note;
    },
    async deleteState(code) { states.delete(code); },
    async close() { timers.forEach(clearTimeout); timers.clear(); },
  };
};

/* ── Redis (shared across instances) ──────────────────────────────────────── */
// Remove a seat only if THIS socket still holds it — atomic, so a reconnect
// that already took the seat on another instance is never kicked out.
const CLEAR_SLOT_LUA = `
if redis.call("HGET", KEYS[1], ARGV[1]) == ARGV[2] then
  redis.call("HDEL", KEYS[1], ARGV[1])
end
return redis.call("HLEN", KEYS[1])`;

const createRedisStore = (redis, prefix = "room") => {
  const slotKey = (code) => `${prefix}:${code}:slots`;
  const stateKey = (code) => `${prefix}:${code}:state`;
  const notesKey = (code) => `${prefix}:${code}:notes`;

  return {
    kind: "redis",
    async getSlots(code) { return redis.hgetall(slotKey(code)); },
    async setSlot(code, role, socketId) {
      await redis.multi()
        .hset(slotKey(code), role, socketId)
        .expire(slotKey(code), ROOM_TTL_SECONDS)
        .exec();
    },
    async clearSlot(code, role, socketId) {
      await redis.eval(CLEAR_SLOT_LUA, 1, slotKey(code), role, socketId);
    },
    async getState(code) {
      const [[, s], [, n]] = await redis.multi().hgetall(stateKey(code)).hgetall(notesKey(code)).exec();
      const notes = {};
      for (const [idx, json] of Object.entries(n || {})) notes[idx] = JSON.parse(json);
      return {
        started: s?.started === "1",
        ended: s?.ended === "1",
        questionIndex: Number(s?.questionIndex) || 0,
        notes,
      };
    },
    async patchState(code, fields) {
      const flat = {};
      if ("started" in fields) flat.started = fields.started ? "1" : "0";
      if ("ended" in fields) flat.ended = fields.ended ? "1" : "0";
      if ("questionIndex" in fields) flat.questionIndex = String(fields.questionIndex);
      const ttl = fields.ended ? ENDED_TTL_SECONDS : ROOM_TTL_SECONDS;
      await redis.multi()
        .hset(stateKey(code), flat)
        .expire(stateKey(code), ttl)
        .expire(notesKey(code), ttl)
        .expire(slotKey(code), ttl)
        .exec();
    },
    async setNote(code, index, note) {
      // One hash field per question, so two quick edits never overwrite each other.
      await redis.multi()
        .hset(notesKey(code), String(index), JSON.stringify(note))
        .expire(notesKey(code), ROOM_TTL_SECONDS)
        .exec();
    },
    async deleteState(code) { await redis.del(stateKey(code), notesKey(code)); },
    async close() {},
  };
};

module.exports = { createMemoryStore, createRedisStore, ROOM_TTL_SECONDS, ENDED_TTL_SECONDS };
