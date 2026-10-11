const express = require("express");
const crypto = require("crypto");
const twilio = require("twilio");

const Alert = require("../models/Alert");
const Contact = require("../models/Contact");

const router = express.Router();


// ===============================
// TWILIO CLIENT
// ===============================

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);


// ===============================
// TWILIO WHATSAPP SETTINGS
// ===============================

const WHATSAPP_FROM =
    process.env.TWILIO_WHATSAPP_FROM;


// Twilio Trial / Sandbox
// Pre-approved Appointment Reminder template
const CONTENT_SID =
    "HXb5b62575e6e4ff6129ad7c8efe1f983e";


// ===============================
// CREATE SOS ALERT
// ===============================

router.post("/", async (req, res) => {

    try {

        console.log("========== CREATE SOS ==========");
        console.log("Request Body:", req.body);


        const {
            latitude,
            longitude
        } = req.body;


        // ===============================
        // VALIDATE LOCATION
        // ===============================

        if (
            latitude === undefined ||
            longitude === undefined
        ) {

            return res.status(400).json({
                success: false,
                message: "Location is required"
            });

        }


        // ===============================
        // GENERATE ALERT ID
        // ===============================

        const alertId =
            "SOS-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase();


        // ===============================
        // SAVE ALERT TO MONGODB
        // ===============================

        const alert =
            await Alert.create({

                alertId,
                latitude,
                longitude

            });


        console.log(
            "SOS Alert saved:",
            alert
        );


        // ===============================
        // GET EMERGENCY CONTACTS
        // ===============================

        const contacts =
            await Contact.find();


        console.log(
            "Emergency contacts found:",
            contacts.length
        );


        // ===============================
        // GOOGLE MAPS LINK
        // ===============================

        const mapLink =
            `https://www.google.com/maps?q=${latitude},${longitude}`;


        console.log(
            "Google Maps Link:",
            mapLink
        );


        // ===============================
        // SEND WHATSAPP
        // ===============================

        let whatsappSent = 0;
        let whatsappFailed = 0;


        for (const contact of contacts) {

            try {

                // ===============================
                // CHECK PHONE NUMBER
                // ===============================

                if (!contact.phone) {

                    console.log(
                        `No phone number for ${contact.name}`
                    );

                    whatsappFailed++;

                    continue;
                }


                // ===============================
                // FORMAT PHONE NUMBER
                // ===============================

                let phone =
                    contact.phone.trim();


                // Example:
                // 9876543210
                // becomes:
                // +919876543210

                if (
                    phone.length === 10 &&
                    /^[0-9]+$/.test(phone)
                ) {

                    phone =
                        "+91" + phone;

                }


                const whatsappTo =
                    `whatsapp:${phone}`;


                console.log(
                    "Sending WhatsApp to:",
                    whatsappTo
                );


                // ===============================
                // CURRENT DATE & TIME
                // ===============================

                const currentDate =
                    new Date();


                const dateText =
                    currentDate.toLocaleDateString(
                        "en-IN"
                    );


                const timeText =
                    currentDate.toLocaleTimeString(
                        "en-IN"
                    );


                // ===============================
                // SEND TWILIO TEMPLATE
                // ===============================

                const message =
                    await twilioClient.messages.create({

                        from:
                            WHATSAPP_FROM,

                        to:
                            whatsappTo,

                        contentSid:
                            CONTENT_SID,

                        contentVariables:
                            JSON.stringify({

                                "1":
                                    dateText,

                                "2":
                                    timeText

                            })

                    });


                whatsappSent++;


                console.log(
                    `WhatsApp sent successfully to ${contact.phone}`
                );

                console.log(
                    "Message SID:",
                    message.sid
                );


            } catch (whatsappError) {

                whatsappFailed++;


                console.error(
                    `WhatsApp failed for ${contact.phone}:`,
                    whatsappError.message
                );

            }

        }


        // ===============================
        // RESPONSE
        // ===============================

        res.status(201).json({

            success: true,

            message:
                "SOS alert processed successfully",

            alert,

            whatsappSent,

            whatsappFailed,

            mapLink

        });


    } catch (error) {

        console.error(
            "CREATE SOS ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

});


// ===============================
// GET ALL ALERTS
// ===============================

router.get("/", async (req, res) => {

    try {

        const alerts =
            await Alert.find()
                .sort({
                    createdAt: -1
                });


        res.status(200).json({

            success: true,

            alerts

        });


    } catch (error) {

        console.error(
            "GET ALERTS ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                error.message

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

                message:
                    "Alert not found"

            });

        }


        res.json({

            success: true,

            message:
                "Alert resolved",

            alert

        });


    } catch (error) {

        console.error(
            "RESOLVE ALERT ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                error.message

        });

    }

});


// ===============================
// EXPORT ROUTER
// ===============================

module.exports = router;