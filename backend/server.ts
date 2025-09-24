import express from "express";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";


import connectDB from "./config/db";
import { initIO } from "./socket";
import User from "./models/User";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import slotRoutes from "./routes/slotRoutes";
import testEmailRoutes from "./routes/testEmail";

// Seed super-admin and admin users at startup
dotenv.config({ path: path.resolve(__dirname, "../.env") });


// Confirm environment variables
console.log("PORT:", process.env.PORT || 5000);
console.log("FRONTEND_URLS:", process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
console.log("DB URI exists?", !!(process.env.MONGO_URI || process.env.MONGODB_URL));

// Connect to MongoDB
connectDB();
// Kick off admin seeding (non-blocking)
seedAdminUsers();

const app = express();
const server = http.createServer(app);

// Seed super-admin and admin accounts (runs once if they do not exist)
async function seedAdminUsers() {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "aadarshgolucky@gmail.com";
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "Aa1#Aa1#";
    const adminEmail = process.env.ADMIN_EMAIL || "goodluckaadarsh@mail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Aa1#Aa1#";

    // Super Admin
    let superAdmin = await User.findOne({ email: superAdminEmail });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: "Super Admin",
        email: superAdminEmail,
        password: superAdminPassword,
        role: "super-admin",
      });
      console.log("✅ Seeded super-admin:", superAdminEmail);
    }

    // Admin
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      console.log("✅ Seeded admin:", adminEmail);
    }
  } catch (err) {
    console.error("⚠️ Admin seeding failed:", err);
  }
}

// Allowed origins for CORS (production only; configured via env)
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set(envOrigins)];

// Socket.IO initialization
initIO(server, allowedOrigins);

// Middleware
app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/test", testEmailRoutes);

// Health check endpoint
app.get("/health", (_req, res) => res.send("Server is running ✅"));

// Serve frontend
// Adjust path for Render: backend/dist -> ../../frontend/dist
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  console.log("Serving frontend from:", frontendDist);
  app.use(express.static(frontendDist));

  // Catch-all route to serve index.html for SPA
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  console.log("Frontend dist not found. Build frontend first.");
}

// Self-ping to prevent cold start (optional)
if (process.env.SELF_URL) {
  setInterval(() => {
    axios.get(process.env.SELF_URL!)
      .then(() => console.log("✅ Self-ping successful"))
      .catch(() => console.log("⚠️ Self-ping failed"));
  }, 5 * 60 * 1000);
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
