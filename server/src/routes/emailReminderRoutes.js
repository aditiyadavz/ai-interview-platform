const express = require("express");
const { protect } = require("../middleware/authMiddleware");  // your existing auth middleware
const { blockDemo } = require("../middleware/demoGuard");
const {
  getReminderPreference,
  setReminderPreference,
  sendTestReminder,
  triggerBatch,
} = require("../controllers/emailReminderController");

const router = express.Router();

router.get ("/preference", protect, getReminderPreference);
router.put ("/preference", protect, blockDemo, setReminderPreference);
router.post("/test-me",    protect, blockDemo, sendTestReminder);
router.post("/trigger",    protect, triggerBatch);

module.exports = router;