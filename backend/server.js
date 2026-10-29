require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");

const Contact = require("./models/Contact");
const Alert = require("./models/Alert");
const LocationShare = require("./models/LocationShare");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://127.0.0.1:5501/frontend";

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Silent SOS backend is running."
  });
});

// ==========================================
// LOCATION SHARING
// ==========================================

// 1. Generate a secure location-sharing link
app.post("/api/location-shares", async (req, res) => {
  try {
    const { contactId } = req.body;

    if (!mongoose.isValidObjectId(contactId)) {
      return res.status(400).json({
        success: false,
        message: "Valid contact ID is required."
      });
    }

    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await LocationShare.create({
      contactId: contact._id,
      tokenHash,
      expiresAt,
      consentGiven: false,
      revoked: false
    });

    const link =
      `${FRONTEND_URL}/share-location.html?token=${token}`;

    res.status(201).json({
      success: true,
      message: "Location-sharing link created.",
      link,
      expiresAt
    });
  } catch (error) {
    console.error("Create location link error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create location-sharing link."
    });
  }
});

// 2. Verify link before showing the consent page
app.get("/api/location-shares/verify/:token", async (req, res) => {
  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const share = await LocationShare.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() }
    }).populate("contactId", "name");

    if (!share || !share.contactId) {
      return res.status(410).json({
        success: false,
        message: "This link is invalid or has expired."
      });
    }

    res.json({
      success: true,
      contactName: share.contactId.name,
      expiresAt: share.expiresAt
    });
  } catch (error) {
    console.error("Verify location link error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to verify the link."
    });
  }
});

// 3. Save location only after explicit consent
app.post("/api/location-shares/consent/:token", async (req, res) => {
  try {
    const { consent, latitude, longitude } = req.body;

    if (consent !== true) {
      return res.status(400).json({
        success: false,
        message: "Location-sharing consent is required."
      });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid location coordinates are required."
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const share = await LocationShare.findOne({
      tokenHash,
      revoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!share) {
      return res.status(410).json({
        success: false,
        message: "This link is invalid or has expired."
      });
    }

    share.consentGiven = true;
    share.latitude = latitude;
    share.longitude = longitude;
    share.sharedAt = new Date();

    await share.save();

    res.json({
      success: true,
      message: "Your location has been shared successfully."
    });
  } catch (error) {
    console.error("Save shared location error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to save shared location."
    });
  }
});

// 4. Get locations explicitly shared by contacts
app.get("/api/location-shares/shared", async (req, res) => {
  try {
    const data = await LocationShare.find({
      consentGiven: true,
      revoked: false,
      expiresAt: { $gt: new Date() },
      latitude: { $ne: null },
      longitude: { $ne: null }
    })
      .populate("contactId", "name phone")
      .sort({ sharedAt: -1 });

    const locations = data.map((share) => ({
      id: share._id,
      contactName: share.contactId?.name || "Emergency Contact",
      phone: share.contactId?.phone || "",
      latitude: share.latitude,
      longitude: share.longitude,
      sharedAt: share.sharedAt,
      expiresAt: share.expiresAt
    }));

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error("Get shared locations error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load shared locations."
    });
  }
});
// 5. Revoke location sharing and clear saved coordinates
app.patch("/api/location-shares/:id/revoke", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location-sharing ID."
      });
    }

    const share = await LocationShare.findById(id);

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Location-sharing record not found."
      });
    }

    share.revoked = true;
    share.latitude = null;
    share.longitude = null;
    share.consentGiven = false;

    await share.save();

    res.json({
      success: true,
      message: "Location sharing revoked successfully."
    });
  } catch (error) {
    console.error("Revoke location error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to revoke location sharing."
    });
  }
});

// ==========================================
// CONTACTS
// ==========================================

// Get all contacts
app.get("/api/contacts", async (_req, res) => {
  try {
    const data = await Contact.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Load contacts error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load contacts."
    });
  }
});

// Add contact
app.post("/api/contacts", async (req, res) => {
  try {
    const {
      name,
      phone,
      email = "",
      relationship = ""
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required."
      });
    }

    const contact = await Contact.create({
      name,
      phone,
      email,
      relationship
    });

    res.status(201).json({
      success: true,
      message: "Contact saved.",
      data: contact
    });
  } catch (error) {
    console.error("Save contact error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to save contact."
    });
  }
});

// Delete contact
app.delete("/api/contacts/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact ID."
      });
    }

    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found."
      });
    }

    res.json({
      success: true,
      message: "Contact deleted."
    });
  } catch (error) {
    console.error("Delete contact error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to delete contact."
    });
  }
});

// ==========================================
// SOS ALERTS
// ==========================================

// Get alerts
app.get("/api/alerts", async (_req, res) => {
  try {
    const data = await Alert.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Load alerts error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load alerts."
    });
  }
});

// Create SOS alert
app.post("/api/alerts", async (req, res) => {
  try {
    const {
      latitude = null,
      longitude = null,
      locationAccuracy = null,
      message = "Demo SOS alert"
    } = req.body;

    const alert = await Alert.create({
      latitude,
      longitude,
      locationAccuracy,
      message,
      status: "active"
    });

    res.status(201).json({
      success: true,
      message: "Demo alert saved. No SMS or WhatsApp message was sent.",
      data: alert
    });
  } catch (error) {
    console.error("Create alert error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to create alert."
    });
  }
});

// Update alert status
app.patch("/api/alerts/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "sent", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, sent, or resolved."
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alert ID."
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found."
      });
    }

    res.json({
      success: true,
      message: "Alert status updated.",
      data: alert
    });
  } catch (error) {
    console.error("Update alert error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to update alert status."
    });
  }
});

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

app.get("/api/dashboard/stats", async (_req, res) => {
  try {
    const [
      totalContacts,
      totalAlerts,
      activeAlerts,
      resolvedAlerts
    ] = await Promise.all([
      Contact.countDocuments(),
      Alert.countDocuments(),
      Alert.countDocuments({ status: { $ne: "resolved" } }),
      Alert.countDocuments({ status: "resolved" })
    ]);

    res.json({
      success: true,
      data: {
        totalContacts,
        totalAlerts,
        activeAlerts,
        resolvedAlerts
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load dashboard statistics."
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Add it to backend/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

start();