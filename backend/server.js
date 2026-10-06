const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const contactRoutes = require("./routes/contactRoutes");
const alertRoutes = require("./routes/alertRoutes");

app.use("/api/contacts", contactRoutes);
app.use("/api/alerts", alertRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Silent SOS Backend is running"
    });
});

// MongoDB connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");
        console.log(
            "Connected Database:",
            mongoose.connection.name
        );

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error(
            "MongoDB Connection Error:",
            error
        );
    });