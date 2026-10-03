const { Schema, model } = require("mongoose");
module.exports = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      passwordHash: { type: String, required: true, select: false },
      verified: { type: Boolean, default: false },
      tokenVersion: { type: Number, default: 0 },
      verificationHash: { type: String, select: false },
      verificationExpires: Date,
      resetHash: { type: String, select: false },
      resetExpires: Date,
    },
    { timestamps: true },
  ),
);
