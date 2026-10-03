const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Device = require("../models/Device");
const { config } = require("../config");
const { text, email } = require("../middleware/validate");
const validatePassword = require("../middleware/validate").password;
const { fail } = require("../middleware/errors");
const { queueMail, capability } = require("../services/mail");
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  verified: u.verified,
});
const credentials = (u) => ({
  token: jwt.sign({ sub: u.id, version: u.tokenVersion }, config.secret, {
    expiresIn: "7d",
  }),
  user: publicUser(u),
  notifications: capability(),
});
async function sendVerification(u) {
  const token = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { _id: u._id },
    {
      verificationHash: hash(token),
      verificationExpires: new Date(Date.now() + 86400000),
    },
  );
  await queueMail(
    u.email,
    "Verify your TrailGuard email",
    "Verify your email: " + config.webUrl + "/verify?token=" + token,
    u._id,
  );
}
exports.register = async (req, res) => {
  const name = text(req.body.name, "Name", 80),
    address = email(req.body.email),
    password = validatePassword(req.body.password);
  if (await User.exists({ email: address }))
    fail(409, "An account with this email already exists.");
  const u = await User.create({
    name,
    email: address,
    passwordHash: await bcrypt.hash(password, 12),
  });
  await sendVerification(u);
  res.status(201).json(credentials(u));
};
exports.login = async (req, res) => {
  const address = email(req.body.email),
    password = validatePassword(req.body.password, 1);
  const u = await User.findOne({ email: address }).select("+passwordHash");
  if (!u || !(await bcrypt.compare(password, u.passwordHash)))
    fail(401, "Email or password is incorrect.");
  res.json(credentials(u));
};
exports.me = (req, res) =>
  res.json({ user: publicUser(req.user), notifications: capability() });
exports.profile = async (req, res) => {
  req.user.name = text(req.body.name, "Name", 80);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
};
exports.logout = async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  await Device.deleteMany({ user: req.user.id });
  res.json({ success: true });
};
exports.resend = async (req, res) => {
  if (!req.user.verified) await sendVerification(req.user);
  res.json({
    message: "Verification email queued.",
    notifications: capability(),
  });
};
exports.verify = async (req, res) => {
  const token = text(req.body.token, "Verification token", 128);
  const u = await User.findOneAndUpdate(
    { verificationHash: hash(token), verificationExpires: { $gt: new Date() } },
    {
      $set: { verified: true },
      $unset: { verificationHash: 1, verificationExpires: 1 },
    },
    { returnDocument: "after" },
  );
  if (!u)
    fail(
      400,
      "This verification link is invalid or expired. Request a new one.",
    );
  res.json({ user: publicUser(u) });
};
exports.forgot = async (req, res) => {
  const u = await User.findOne({ email: email(req.body.email) });
  if (u) {
    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne(
      { _id: u.id },
      { resetHash: hash(token), resetExpires: new Date(Date.now() + 3600000) },
    );
    await queueMail(
      u.email,
      "Reset your TrailGuard password",
      "Reset your password: " +
        config.webUrl +
        "/reset-password?token=" +
        token,
      u._id,
    );
  }
  res.json({
    message: "If that account exists, a reset email has been queued.",
  });
};
exports.reset = async (req, res) => {
  const token = text(req.body.token, "Reset token", 128),
    password = validatePassword(req.body.password);
  const u = await User.findOneAndUpdate(
    { resetHash: hash(token), resetExpires: { $gt: new Date() } },
    {
      $set: { passwordHash: await bcrypt.hash(password, 12) },
      $inc: { tokenVersion: 1 },
      $unset: { resetHash: 1, resetExpires: 1 },
    },
  );
  if (!u) fail(400, "This password reset link is invalid or expired.");
  await Device.deleteMany({ user: u.id });
  res.json({ message: "Password updated. Please sign in." });
};
exports.publicUser = publicUser;
