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

        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Name and email are required"
            });
        }

        // Create contact
        const contact = await Contact.create({
            name: name.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : ""
        });

        console.log("Contact saved:", contact);

        res.status(201).json({
            success: true,
            message: "Emergency contact added successfully",
            contact
        });

    } catch (error) {
        console.error("ADD CONTACT ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
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

        res.status(200).json({
            success: true,
            contacts
        });

    } catch (error) {
        console.error("GET CONTACTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


// IMPORTANT
// Export router
module.exports = router;