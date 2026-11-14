const User = require("../../src/models/User");
const { generateToken } = require("../../src/utils/jwt");

let counter = 0;

// Creates a user directly in the DB and returns it with a valid JWT.
const createUser = async (overrides = {}) => {
  counter += 1;
  const user = await User.create({
    name: `Test User ${counter}`,
    email: `user${counter}@example.com`,
    password: "secret123",
    emailVerified: true,
    ...overrides,
  });
  return { user, token: generateToken(user._id) };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createUser, auth };
