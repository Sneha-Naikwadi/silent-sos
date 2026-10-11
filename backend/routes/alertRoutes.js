
const express = require("express");
const crypto = require("crypto");
const twilio = require("twilio");

const Alert = require("../models/Alert");

const router = express.Router();

// ===============================
// TWILIO CONFIGURATION
// ===============================

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

// Test only: use the WhatsApp number that joined your Sandbox.
// Example environment variable value: 7385201801
const TEST_PHONE = process.env.TWILIO_TEST_PHONE;

// ===============================
// CREATE SOS ALERT
// ===============================

router.post("/", async (req, res) => {
    try {
        console.log("========== CREATE SOS ==========");

        const { latitude, longitude } = req.body;

        // Validate location
        if (
            latitude === undefined ||
            longitude === undefined ||
            !Number.isFinite(Number(latitude)) ||
            !Number.isFinite(Number(longitude)) ||
            Number(latitude) < -90 ||
            Number(latitude) > 90 ||
            Number(longitude) < -180 ||
            Number(longitude) > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required"
            });
        }

        // Check Twilio test configuration before creating alert
        if (!TEST_PHONE || !WHATSAPP_FROM) {
            return res.status(500).json({
                success: false,
                message:
                    "Configure TWILIO_TEST_PHONE and TWILIO_WHATSAPP_FROM"
            });
        }

        // Generate alert ID
        const alertId =
            "SOS-" +
            crypto.randomBytes(4).toString("hex").toUpperCase();

        // Save SOS alert
        const alert = await Alert.create({
            alertId,
            latitude: Number(latitude),
            longitude: Number(longitude)
        });

        // Google Maps link
        const mapLink =
            `https://www.google.com/maps?q=${latitude},${longitude}`;

        // Format test recipient number
        let phone = TEST_PHONE.trim();

        if (/^[0-9]{10}$/.test(phone)) {
            phone = "+91" + phone;
        } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
            return res.status(500).json({
                success: false,
                message:
                    "TWILIO_TEST_PHONE must be a 10-digit Indian number or E.164 number"
            });
        }

        const whatsappTo = `whatsapp:${phone}`;

        // IMPORTANT: Only one Sandbox-joined test recipient
        let whatsappSent = 0;
        let whatsappFailed = 0;
        let messageSid = null;
        let messageStatus = null;
        let whatsappErrorMessage = null;

        try {
            const message = await twilioClient.messages.create({
                from: WHATSAPP_FROM,
                to: whatsappTo,
                body:
                    `🚨 SILENT SOS - EMERGENCY ALERT\n\n` +
                    `Emergency! I need help. Please contact me immediately.\n\n` +
                    `My location:\n${mapLink}\n\n` +
                    `Alert ID: ${alertId}`
            });

            // Request accepted by Twilio; delivery is not guaranteed yet
            whatsappSent = 1;
            messageSid = message.sid;
            messageStatus = message.status;

            console.log("Twilio Message SID:", message.sid);
            console.log("Initial message status:", message.status);
        } catch (error) {
            whatsappFailed = 1;
            whatsappErrorMessage = error.message;

            console.error("WhatsApp send failed:", error.message);
            console.error("Twilio error code:", error.code);
        }

        return res.status(201).json({
            success: true,
            message: "SOS alert saved",
            alert,
            mapLink,
            whatsappSent,
            whatsappFailed,
            messageSid,
            messageStatus,
            whatsappError: whatsappErrorMessage
        });
    } catch (error) {
        console.error("CREATE SOS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===============================
// GET ALL ALERTS
// ===============================

router.get("/", async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            alerts
        });
    } catch (error) {
        console.error("GET ALERTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===============================
// RESOLVE ALERT
// ===============================

router.put("/:id/resolve", async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { status: "RESOLVED" },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        return res.json({
            success: true,
            message: "Alert resolved",
            alert
        });
    } catch (error) {
        console.error("RESOLVE ALERT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===============================
// EXPORT ROUTER
// ===============================

module.exports = router;
