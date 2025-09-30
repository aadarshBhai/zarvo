import express from "express";
import http from "http";
import cors from "cors";
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
import adminRoutes from "./routes/adminRoutes";
import ratingRoutes from "./routes/ratingRoutes";

// Load env from both root .env (ts-node dev) and backend/.env (built dist)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

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

// Seed admin account (runs once if it does not exist)
async function seedAdminUsers() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "zarvoadmin@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Aa1#Aa1#";

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      console.log("✅ Seeded admin:", adminEmail);
    } else if (process.env.NODE_ENV !== "production") {
      admin.password = adminPassword;
      await admin.save();
      console.log("🔐 Updated admin password (dev mode)");
    }
  } catch (err) {
    console.error("⚠️ Admin seeding failed:", err);
  }
}

// Allowed origins for CORS/Socket.IO
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const isProd = process.env.NODE_ENV === "production";
const devDefaults = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
const baseAllowed: (string | RegExp)[] = [
  ...new Set(
    envOrigins.length > 0
      ? isProd
        ? envOrigins
        : [...envOrigins, ...devDefaults]
      : isProd
      ? []
      : devDefaults
  ),
];

// In development, also allow private LAN IPs commonly used by Vite/React dev servers
if (!isProd) {
  const privateLan5173 = [
    /^http:\/\/10\.(?:\d{1,3}\.){2}\d{1,3}:5173$/,
    /^http:\/\/192\.168\.(?:\d{1,3})\.\d{1,3}:5173$/,
    /^http:\/\/172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3})\.\d{1,3}:5173$/,
  ];
  const privateLan8080 = [
    /^http:\/\/10\.(?:\d{1,3}\.){2}\d{1,3}:8080$/,
    /^http:\/\/192\.168\.(?:\d{1,3})\.\d{1,3}:8080$/,
    /^http:\/\/172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3})\.\d{1,3}:8080$/,
  ];
  baseAllowed.push(...privateLan5173, ...privateLan8080);
}

const allowedOrigins = baseAllowed;

// Socket.IO initialization
initIO(server, allowedOrigins);

// Middleware
app.use(express.json());
app.use(cors({ origin: allowedOrigins as any, credentials: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/test", testEmailRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ratings", ratingRoutes);

// Health check endpoint
app.get("/health", (_req, res) => res.send("Server is running ✅"));

// Serve frontend
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
    axios
      .get(process.env.SELF_URL!)
      .then(() => console.log("✅ Self-ping successful"))
      .catch(() => console.log("⚠️ Self-ping failed"));
  }, 5 * 60 * 1000);
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
