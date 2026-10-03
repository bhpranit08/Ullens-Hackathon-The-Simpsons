const { Schema, model } = require("mongoose");
const schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    session: { type: Schema.Types.ObjectId, ref: "Session" },
    alert: Schema.Types.ObjectId,
    recipient: { type: Schema.Types.ObjectId, ref: "User" },
    channel: { type: String, enum: ["email", "push"], required: true },
    to: String,
    subject: String,
    text: String,
    data: Schema.Types.Mixed,
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "accepted",
        "receipt_ok",
        "failed",
        "cancelled",
        "preview",
      ],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date,
    leaseId: String,
    providerId: String,
    error: String,
  },
  { timestamps: true },
);
schema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1 });
module.exports = model("Delivery", schema);
