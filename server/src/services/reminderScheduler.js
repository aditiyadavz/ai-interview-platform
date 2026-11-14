const cron = require("node-cron");
const { sendWeeklyReminders } = require("./emailReminderService");

// When several API instances share Redis, every one of them runs this cron.
// A short-lived lock per week makes sure only the first sends the emails.
const LOCK_TTL_SECONDS = 6 * 60 * 60;

const acquireWeeklyLock = async (redis, now = new Date()) => {
  if (!redis) return true; // single instance — nothing to coordinate
  const key = `cron:weekly-reminders:${now.toISOString().slice(0, 10)}`;
  return (await redis.set(key, String(process.pid), "EX", LOCK_TTL_SECONDS, "NX")) === "OK";
};

function initReminderScheduler({ redis = null } = {}) {
  // Fires every Monday at 09:00 (server local time)
  cron.schedule("0 9 * * 1", async () => {
    console.log(`\n🕘 [${new Date().toISOString()}] Weekly reminder cron triggered`);
    try {
      if (!(await acquireWeeklyLock(redis))) {
        console.log("ℹ️  Another instance is sending this week's reminders — skipping");
        return;
      }
      const result = await sendWeeklyReminders();
      console.log(`📊 Result: ${result.sent} sent, ${result.failed} failed\n`);
    } catch (err) {
      console.error("❌ Reminder cron failed:", err);
    }
  });

  console.log("⏰ Weekly reminder cron scheduled — fires every Monday at 09:00");
}

module.exports = { initReminderScheduler, acquireWeeklyLock };
