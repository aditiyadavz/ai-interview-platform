const express = require("express");
const { getProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { blockDemo } = require("../middleware/demoGuard");
const { validateUpdateProfile } = require("../middleware/validate");
const router = express.Router();

router.get("/profile", protect,                           getProfile);
router.put("/profile", protect, blockDemo, validateUpdateProfile, updateProfile);

module.exports = router;