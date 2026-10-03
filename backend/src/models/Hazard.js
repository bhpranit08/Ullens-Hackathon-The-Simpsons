const { Schema, model } = require("mongoose");
module.exports = model(
  "Hazard",
  new Schema(
    {
      reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
      category: {
        type: String,
        enum: ["Traffic", "Road", "Weather", "Wildlife", "Other"],
        required: true,
      },
      severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true,
      },
      description: { type: String, required: true, trim: true, maxlength: 500 },
      location: { type: require("./Session").locationSchema, required: true },
    },
    { timestamps: true },
  ),
);
