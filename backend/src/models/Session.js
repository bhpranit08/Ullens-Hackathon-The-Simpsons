const { Schema, model } = require("mongoose");
const locationSchema = new Schema(
  {
    lat: Number,
    lng: Number,
    accuracy: Number,
    observedAt: Date,
    receivedAt: Date,
    source: { type: String, enum: ["gps", "browser", "simulated"] },
    pingId: String,
  },
  { _id: false },
);
const eventSchema = new Schema({
  type: String,
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  location: locationSchema,
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date,
});
const schema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contact: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    activityType: {
      type: String,
      enum: ["Cycling", "Running", "Trekking"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    expectedEndTime: { type: Date, required: true },
    checkInMinutes: { type: Number, required: true, min: 1, max: 240 },
    nextCheckInDue: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "alerting", "sos", "completed"],
      default: "active",
    },
    unfinished: { type: Boolean, default: true },
    trackingMode: { type: String, enum: ["live", "demo"], default: "demo" },
    lastLocation: locationSchema,
    events: [eventSchema],
    revision: { type: Number, default: 0 },
    currentAlert: { type: Schema.Types.ObjectId },
    completedAt: Date,
    migrationVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);
schema.index(
  { owner: 1 },
  { unique: true, partialFilterExpression: { unfinished: true } },
);
schema.index({ status: 1, nextCheckInDue: 1 });
module.exports = model("Session", schema);
module.exports.locationSchema = locationSchema;
