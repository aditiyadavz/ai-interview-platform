const User      = require("../models/User");
const Interview = require("../models/Interview");

// Public — real platform counts for the homepage. No inflation happens
// here; the frontend is responsible for rounding these down to a
// friendly "10+" / "20+" style display.
const getPublicStats = async (req, res) => {
  try {
    // The demo account's interviews are seeded sample data — never count
    // them as real platform usage.
    const demoIds = await User.find({ isDemo: true }).distinct("_id");
    const realInterviews = { completed: true, user: { $nin: demoIds } };

    const [userCount, interviewCount, answersAgg] = await Promise.all([
      User.countDocuments({ isDemo: { $ne: true } }),
      Interview.countDocuments(realInterviews),
      Interview.aggregate([
        { $match: realInterviews },
        { $project: { answerCount: { $size: { $ifNull: ["$answers", []] } } } },
        { $group: { _id: null, total: { $sum: "$answerCount" } } },
      ]),
    ]);

    const questionsAnswered = answersAgg[0]?.total || 0;

    res.json({
      users: userCount,
      interviews: interviewCount,
      questionsAnswered,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicStats };