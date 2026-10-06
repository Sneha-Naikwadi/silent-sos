const express = require("express");
const crypto = require("crypto");

const Alert = require("../models/Alert");
const Contact = require("../models/Contact");

const router = express.Router();


// ===============================
// SEND EMAIL USING RESEND
// ===============================
async function sendEmail(to, subject, html) {
    const response = await fetch(
        "https://api.resend.com/emails",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization":
                    `Bearer ${process.env.RESEND_API_KEY}`
            },

            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                to: [to],
                subject: subject,
                html: html
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Resend API Error: ${response.status}`
        );
    }

    return data;
}


// ===============================
// CREATE SOS ALERT
// ===============================
router.post("/", async (req, res) => {

    try {

        console.log("========== CREATE SOS ==========");
        console.log("Request Body:", req.body);


        const { latitude, longitude } = req.body;


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
        const alert = await Alert.create({

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


        // ===============================
        // SEND EMAIL TO EVERY CONTACT
        // ===============================
        let sentCount = 0;
        let failedCount = 0;


        for (const contact of contacts) {

            try {

                const emailHTML = `

                    <div
                        style="
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        "
                    >

                        <h2
                            style="
                                color: red;
                            "
                        >
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
                            <a
                                href="${mapLink}"
                                target="_blank"
                            >
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

                `;


                const result =
                    await sendEmail(
                        contact.email,
                        "🚨 SILENT SOS EMERGENCY ALERT",
                        emailHTML
                    );


                sentCount++;


                console.log(
                    `Email sent to ${contact.email}`,
                    result
                );


            } catch (emailError) {

                failedCount++;


                console.error(
                    `Email failed for ${contact.email}:`,
                    emailError.message
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

            emailsSent: sentCount,

            emailsFailed: failedCount

        });


    } catch (error) {

        console.error(
            "CREATE SOS ERROR:",
            error
        );


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

        console.error(
            "RESOLVE ALERT ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message: error.message

        });

    }

});


// ===============================
// EXPORT ROUTER
// ===============================
module.exports = router;