const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["active", "sent", "resolved"],
      default: "active"
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationAccuracy: { type: Number, default: null },
    message: { type: String, default: "Demo SOS alert" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
