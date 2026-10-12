const express = require("express");
const crypto = require("crypto");
const twilio = require("twilio");

const Alert = require("../models/Alert");
const Contact = require("../models/Contact");

const router = express.Router();

// ===============================
// TWILIO CONFIGURATION
// ===============================

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

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

        if (
            !process.env.TWILIO_ACCOUNT_SID ||
            !process.env.TWILIO_AUTH_TOKEN ||
            !WHATSAPP_FROM
        ) {
            return res.status(500).json({
                success: false,
                message: "Twilio environment variables are missing"
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

        // Get contacts from MongoDB
        const contacts = await Contact.find();

        let whatsappSent = 0;
        let whatsappFailed = 0;
        const results = [];

        // Send SOS to each saved contact
        for (const contact of contacts) {
            try {
                let phone = String(contact.phone || "")
                    .trim()
                    .replace(/[\s()-]/g, "");

                // Convert Indian mobile number to E.164 format
                if (/^[6-9]\d{9}$/.test(phone)) {
                    phone = "+91" + phone;
                } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
                    whatsappFailed++;

                    results.push({
                        name: contact.name,
                        success: false,
                        error: "Invalid phone number"
                    });

                    continue;
                }

                const message = await twilioClient.messages.create({
                    from: WHATSAPP_FROM,
                    to: `whatsapp:${phone}`,
                    body:
                        `🚨 SILENT SOS - EMERGENCY ALERT\n\n` +
                        `An emergency alert has been triggered. ` +
                        `Please contact the person who needs help.\n\n` +
                        `Location: ${mapLink}\n` +
                        `Alert ID: ${alertId}`
                });

                // Twilio accepted the message request
                whatsappSent++;

                results.push({
                    name: contact.name,
                    success: true,
                    status: message.status,
                    sid: message.sid
                });

                console.log(
                    "Twilio message accepted for:",
                    contact.name,
                    message.status
                );

            } catch (error) {
                whatsappFailed++;

                results.push({
                    name: contact.name,
                    success: false,
                    error: error.message,
                    code: error.code || null
                });

                console.error(
                    "WhatsApp failed for:",
                    contact.name,
                    error.message,
                    error.code
                );
            }
        }

        return res.status(201).json({
            success: true,
            message: "SOS alert saved",
            alert,
            mapLink,
            totalContacts: contacts.length,
            whatsappSent,
            whatsappFailed,
            results
        });

    } catch (error) {
        console.error("CREATE SOS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create SOS alert",
            error: error.message
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