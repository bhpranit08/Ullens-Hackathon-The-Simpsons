const { Schema, model } = require("mongoose");
const schema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    pingId: { type: String, required: true },
    location: require("./Session").locationSchema,
  },
  { timestamps: true },
);
schema.index({ session: 1, pingId: 1 }, { unique: true });
schema.index({ session: 1, "location.observedAt": 1 });
module.exports = model("LocationPing", schema);
