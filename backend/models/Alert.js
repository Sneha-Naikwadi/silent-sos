const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
    {
        alertId: {
            type: String,
            required: true,
            unique: true
        },

        latitude: {
            type: Number,
            required: true
        },

        longitude: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: [
                "SENT",
                "ACKNOWLEDGED",
                "RESOLVED"
            ],
            default: "SENT"
        },

        triggeredAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Alert",
    alertSchema
);