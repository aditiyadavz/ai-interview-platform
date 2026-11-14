const express = require("express");
const { getTestimonials, getMyTestimonial, createTestimonial } = require("../controllers/testimonialController");
const { protect } = require("../middleware/authMiddleware");
const { blockDemo } = require("../middleware/demoGuard");
const router = express.Router();

router.get("/",     getTestimonials);
router.get("/mine", protect, getMyTestimonial);
router.post("/",    protect, blockDemo, createTestimonial);

module.exports = router;