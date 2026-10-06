const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const Alert = require("../models/Alert");
const Contact = require("../models/Contact");

const router = express.Router();


// ===============================
// EMAIL TRANSPORTER
// ===============================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// ===============================
// CREATE SOS ALERT
// ===============================
router.post("/", async (req, res) => {
    try {
        console.log("========== CREATE SOS ==========");
        console.log("Request Body:", req.body);

        const { latitude, longitude } = req.body;

        // Validate location
        if (
            latitude === undefined ||
            longitude === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Location is required"
            });
        }

        // Generate alert ID
        const alertId =
            "SOS-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase();

        // Save alert
        const alert = await Alert.create({
            alertId,
            latitude,
            longitude
        });

        console.log("SOS Alert saved:", alert);


        // Get contacts
        const contacts = await Contact.find();

        console.log(
            "Emergency contacts found:",
            contacts.length
        );


        // Google Maps link
        const mapLink =
            `https://www.google.com/maps?q=${latitude},${longitude}`;


        // Send email to every contact
        for (const contact of contacts) {

            try {

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: contact.email,

                    subject:
                        "🚨 SILENT SOS EMERGENCY ALERT",

                    html: `
                        <div style="font-family: Arial, sans-serif;">

                            <h2 style="color:red;">
                                🚨 Silent SOS Emergency Alert
                            </h2>

                            <p>
                                An emergency alert has been triggered.
                            </p>

                            <p>
                                <strong>Alert ID:</strong>
                                ${alertId}
                            </p>

                            <p>
                                <strong>Location:</strong>
                                <a href="${mapLink}" target="_blank">
                                    View Live Location
                                </a>
                            </p>

                            <p>
                                <strong>Latitude:</strong>
                                ${latitude}
                            </p>

                            <p>
                                <strong>Longitude:</strong>
                                ${longitude}
                            </p>

                            <p>
                                Please respond immediately.
                            </p>

                        </div>
                    `
                });

                console.log(
                    `Email sent to ${contact.email}`
                );

            } catch (emailError) {

                console.error(
                    `Email failed for ${contact.email}:`,
                    emailError.message
                );

            }
        }


        res.status(201).json({
            success: true,
            message: "SOS alert sent successfully",
            alert
        });

    } catch (error) {

        console.error("CREATE SOS ERROR:", error);

        res.status(500).json({
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

        const alerts = await Alert.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            alerts
        });

    } catch (error) {

        console.error("GET ALERTS ERROR:", error);

        res.status(500).json({
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

        const alert =
            await Alert.findByIdAndUpdate(
                req.params.id,
                {
                    status: "RESOLVED"
                },
                {
                    new: true
                }
            );

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.json({
            success: true,
            message: "Alert resolved",
            alert
        });

    } catch (error) {

        console.error("RESOLVE ALERT ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// IMPORTANT
// Export router
module.exports = router;