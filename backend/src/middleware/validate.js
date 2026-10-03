const mongoose = require("mongoose");
const { fail } = require("./errors");
function text(value, label, max = 100, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(400, label + " is invalid.");
  return value.trim();
}
function email(value) {
  const v = text(value, "Email", 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(v)) fail(400, "Enter a valid email address.");
  return v;
}
function password(value, min = 8) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > 128 ||
    !value.trim()
  )
    fail(400, "Password is invalid.");
  return value;
}
function id(value) {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value))
    fail(400, "Invalid resource ID.");
  return value;
}
function choice(value, options, label) {
  if (!options.includes(value)) fail(400, label + " is invalid.");
  return value;
}
function location(value, source) {
  if (
    !value ||
    typeof value.lat !== "number" ||
    typeof value.lng !== "number" ||
    !Number.isFinite(value.lat) ||
    !Number.isFinite(value.lng) ||
    Math.abs(value.lat) > 90 ||
    Math.abs(value.lng) > 180
  )
    fail(400, "Select a valid map location.");
  if (
    value.accuracy != null &&
    (!Number.isFinite(value.accuracy) || value.accuracy < 0)
  )
    fail(400, "Invalid location accuracy.");
  const observedAt = value.observedAt ? new Date(value.observedAt) : new Date();
  if (!Number.isFinite(+observedAt) || +observedAt > Date.now() + 60000)
    fail(400, "Invalid location timestamp.");
  return {
    lat: value.lat,
    lng: value.lng,
    accuracy: value.accuracy,
    observedAt,
    receivedAt: new Date(),
    source:
      source ||
      choice(value.source, ["gps", "browser", "simulated"], "Location source"),
    pingId: value.pingId,
  };
}
module.exports = { text, email, id, choice, location, password };
