const IORedis = require("ioredis");
const { createMemoryStore, createRedisStore } = require("../src/sockets/roomStore");

// The same behaviour is required from both stores. The Redis run needs a real
// Redis (REDIS_URL) — CI provides one; locally it's skipped if unset.
const contract = (name, makeStore, cleanup) => {
  describe(`${name} room store`, () => {
    let store;
    beforeEach(async () => { store = await makeStore(); });
    afterEach(async () => { await cleanup?.(); await store.close(); });

    it("starts with empty slots and default state", async () => {
      expect(await store.getSlots("R1")).toEqual({});
      expect(await store.getState("R1")).toEqual({ started: false, ended: false, questionIndex: 0, notes: {} });
    });

    it("assigns seats and frees only the socket that holds them", async () => {
      await store.setSlot("R1", "host", "sock-a");
      await store.setSlot("R1", "guest", "sock-b");
      await store.clearSlot("R1", "host", "someone-else"); // stale socket: no effect
      expect(await store.getSlots("R1")).toEqual({ host: "sock-a", guest: "sock-b" });

      await store.clearSlot("R1", "host", "sock-a");
      expect(await store.getSlots("R1")).toEqual({ guest: "sock-b" });
    });

    it("lets a reconnecting socket take over a seat", async () => {
      await store.setSlot("R1", "guest", "old");
      await store.setSlot("R1", "guest", "new");
      await store.clearSlot("R1", "guest", "old"); // old socket's late disconnect
      expect((await store.getSlots("R1")).guest).toBe("new");
    });

    it("persists interview progress and notes per question", async () => {
      await store.patchState("R1", { started: true });
      await store.patchState("R1", { questionIndex: 2 });
      await store.setNote("R1", 0, { notes: "good", rating: 4 });
      await store.setNote("R1", 2, { notes: "", rating: 2 });
      await store.setNote("R1", 0, { notes: "great", rating: 5 }); // overwrite one question only

      expect(await store.getState("R1")).toEqual({
        started: true, ended: false, questionIndex: 2,
        notes: { 0: { notes: "great", rating: 5 }, 2: { notes: "", rating: 2 } },
      });
    });

    it("keeps rooms isolated", async () => {
      await store.patchState("R1", { started: true });
      await store.setSlot("R1", "host", "a");
      expect(await store.getState("R2")).toMatchObject({ started: false });
      expect(await store.getSlots("R2")).toEqual({});
    });

    it("deletes state on request", async () => {
      await store.patchState("R1", { started: true });
      await store.setNote("R1", 0, { notes: "x", rating: 1 });
      await store.deleteState("R1");
      expect(await store.getState("R1")).toEqual({ started: false, ended: false, questionIndex: 0, notes: {} });
    });
  });
};

contract("memory", () => createMemoryStore());

if (process.env.REDIS_URL) {
  let redis;
  const prefix = `test-room-${process.pid}`;
  beforeAll(() => { redis = new IORedis(process.env.REDIS_URL); });
  afterAll(() => redis.quit());

  contract("redis", () => createRedisStore(redis, prefix), async () => {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length) await redis.del(...keys);
  });

  describe("redis room store TTLs", () => {
    afterEach(async () => {
      const keys = await redis.keys(`${prefix}:*`);
      if (keys.length) await redis.del(...keys);
    });

    it("expires abandoned rooms and shortens the TTL once the interview ends", async () => {
      const store = createRedisStore(redis, prefix);
      await store.setSlot("R9", "host", "a");
      await store.patchState("R9", { started: true });
      expect(await redis.ttl(`${prefix}:R9:state`)).toBeGreaterThan(60 * 60);

      await store.patchState("R9", { ended: true });
      const ttl = await redis.ttl(`${prefix}:R9:state`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
      expect(await redis.ttl(`${prefix}:R9:slots`)).toBeLessThanOrEqual(60);
    });
  });
} else {
  describe.skip("redis room store (set REDIS_URL to run)", () => { it("skipped", () => {}); });
}
