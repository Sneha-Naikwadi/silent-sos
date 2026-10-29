
const mongoose = require("mongoose");

const locationShareSchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    },

    consentGiven: {
      type: Boolean,
      default: false
    },

    latitude: {
      type: Number,
      default: null
    },

    longitude: {
      type: Number,
      default: null
    },

    sharedAt: {
      type: Date,
      default: null
    },

    revoked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocationShare", locationShareSchema);
