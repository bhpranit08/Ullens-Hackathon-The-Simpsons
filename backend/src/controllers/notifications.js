const Device = require("../models/Device");
const Delivery = require("../models/Delivery");
const { config } = require("../config");
const { capability } = require("../services/mail");
const { text } = require("../middleware/validate");
const { fail } = require("../middleware/errors");
exports.settings = (_req, res) => res.json(capability());
exports.register = async (req, res) => {
  const token = text(req.body.token, "Push token", 200);
  if (!/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(token))
    fail(400, "Invalid Expo push token.");
  await Device.findOneAndUpdate(
    { token },
    { user: req.user.id, platform: text(req.body.platform, "Platform", 20) },
    { upsert: true },
  );
  res.json({ success: true });
};
exports.remove = async (req, res) => {
  await Device.deleteOne({
    token: text(req.body.token, "Push token", 200),
    user: req.user.id,
  });
  res.json({ success: true });
};
exports.preview = async (req, res) => {
  if (config.mailMode !== "preview" || process.env.NODE_ENV === "production")
    fail(404, "Local mailbox is disabled.");
  const messages = await Delivery.find({ channel: "email", to: req.user.email })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("subject text createdAt status");
  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      text: m.text,
      createdAt: m.createdAt,
      status: m.status,
    })),
  });
};
