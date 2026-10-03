const mongoose = require("mongoose");
const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trailguard",
  secret: process.env.JWT_SECRET,
  webUrl: (process.env.APP_URL || "http://localhost:8081").replace(/\/$/, ""),
  mailMode:
    process.env.MAIL_MODE ||
    (process.env.NODE_ENV === "production" ? "resend" : "preview"),
};
function validateConfig() {
  if (!config.secret || config.secret.length < 24)
    throw new Error("JWT_SECRET must contain at least 24 characters.");
  if (process.env.NODE_ENV === "production" && config.mailMode === "preview")
    throw new Error("MAIL_MODE=preview is for local development only.");
}
async function connect() {
  validateConfig();
  await mongoose.connect(config.mongoUri);
}
module.exports = { config, connect, validateConfig };
