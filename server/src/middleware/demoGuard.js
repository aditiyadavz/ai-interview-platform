// The public demo account is shared by everyone who clicks "Try the demo".
// It can practise interviews, but must never be able to change anything
// that would affect the next visitor (password, profile, resume) or publish
// content under its name (testimonials). Use after `protect`.
const blockDemo = (req, res, next) => {
  if (req.user?.isDemo) {
    return res.status(403).json({
      message: "This action is disabled on the demo account — sign up for free to use it.",
    });
  }
  next();
};

module.exports = { blockDemo };
