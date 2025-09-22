import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";

import connectDB from "./config/db";
import { initIO } from "./socket";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import slotRoutes from "./routes/slotRoutes";
import testEmailRoutes from "./routes/testEmail";

// Load environment variables
const envFiles = [
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env")
];

for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file });
    break;
  }
}

// Confirm environment
console.log("PORT:", process.env.PORT || 5000);
console.log("FRONTEND_URLS:", process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
console.log("DB URI exists?", !!(process.env.MONGO_URI || process.env.MONGODB_URL));

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// CORS setup
const defaultOrigins = ["http://localhost:5173", "http://localhost:8080"];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Socket.IO initialization
initIO(server, allowedOrigins);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/test", testEmailRoutes);

// Health check
app.get("/health", (_req, res) => res.send("Server is running ✅"));

// Serve frontend SPA
const frontendDist = path.resolve(__dirname, "..", "frontend", "dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  console.log("Serving frontend from:", frontendDist);
  app.use(express.static(frontendDist));

  // Catch-all to serve index.html for SPA routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  console.log("Frontend dist not found. Build frontend first.");
  // Optional: Root API info
  app.get("/", (_req, res) => res.send("Server is running ✅. API under /api"));
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
