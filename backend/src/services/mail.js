const crypto = require("node:crypto");
const Delivery = require("../models/Delivery");
const { config } = require("../config");
function capability() {
  return {
    mode: config.mailMode,
    emailConfigured:
      config.mailMode === "preview" ||
      !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    pushConfigured: process.env.PUSH_ENABLED === "true",
  };
}
async function queueMail(to, subject, text, recipient) {
  return Delivery.create({
    key: "mail:" + crypto.randomUUID(),
    channel: "email",
    to,
    subject,
    text,
    recipient,
  });
}
module.exports = { queueMail, capability };
