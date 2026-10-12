const express = require("express");
const Contact = require("../models/Contact");

const router = express.Router();

// ===============================
// ADD EMERGENCY CONTACT
// ===============================
router.post("/", async (req, res) => {
    try {
        console.log("========== ADD CONTACT ==========");
        console.log("Request Body:", req.body);

        const { name, email, phone } = req.body;

        // Validate name, email and phone
        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof phone !== "string" ||
            !phone.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email and valid phone number are required"
            });
        }

        const cleanPhone = phone.trim();

        // Accept 10-digit Indian mobile or international E.164 number
        if (
            !(
                /^[6-9]\d{9}$/.test(cleanPhone) ||
                /^\+[1-9]\d{7,14}$/.test(cleanPhone)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit Indian mobile number or international number with country code"
            });
        }

        // Save contact in MongoDB
        const contact = await Contact.create({
            name: name.trim(),
            email: email.trim(),
            phone: cleanPhone
        });

        console.log("Contact saved:", contact._id);

        return res.status(201).json({
            success: true,
            message: "Emergency contact added successfully",
            contact
        });

    } catch (error) {
        console.error("ADD CONTACT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add contact"
        });
    }
});

// ===============================
// GET ALL EMERGENCY CONTACTS
// ===============================
router.get("/", async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            contacts
        });

    } catch (error) {
        console.error("GET CONTACTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch contacts"
        });
    }
});

// ===============================
// EXPORT ROUTER
// ===============================
module.exports = router;