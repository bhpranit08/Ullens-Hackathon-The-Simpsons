const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { config } = require("../config");
const { fail } = require("./errors");
async function auth(req, _res, next) {
  let decoded;
  try {
    decoded = jwt.verify(
      req.get("authorization")?.replace(/^Bearer\s+/i, ""),
      config.secret,
    );
  } catch {
    fail(401, "Your session has expired. Please sign in again.");
  }
  if (typeof decoded.sub !== "string" || !/^[a-f\d]{24}$/i.test(decoded.sub))
    fail(401, "Invalid authentication token.");
  const user = await User.findById(decoded.sub);
  if (!user || decoded.version !== user.tokenVersion)
    fail(401, "Please sign in again.");
  req.user = user;
  next();
}
function verified(req, _res, next) {
  if (!req.user.verified) fail(403, "Verify your email before continuing.");
  next();
}
module.exports = { auth, verified };
