const { Schema, model } = require("mongoose");
const schema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, maxlength: 80 },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "removed"],
      default: "pending",
    },
    active: { type: Boolean, default: false },
  },
  { timestamps: true },
);
schema.index({ owner: 1, email: 1 }, { unique: true });
module.exports = model("Contact", schema);
