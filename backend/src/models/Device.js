const { Schema, model } = require("mongoose");
module.exports = model(
  "Device",
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      token: { type: String, required: true, unique: true },
      platform: String,
    },
    { timestamps: true },
  ),
);
