import express from "express";
import http from "http";
// Socket.io initialization is handled in ./socket
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import connectDB from "./config/db";
import { initIO } from "./socket";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import slotRoutes from "./routes/slotRoutes";
import testEmailRoutes from "./routes/testEmail";
import axios from "axios";

// Load environment variables. Try ../.env (ts-node) then ../../.env (compiled dist)
const candidates = [
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
];
let loadedEnv = false;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedEnv = true;
    break;
  }
}
if (!loadedEnv) {
  // Fallback to default lookup
  dotenv.config();
}

// Confirm environment variables
console.log("PORT:", process.env.PORT || 5000);
console.log("FRONTEND_URLS:", process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
console.log("DB URI exists?", !!(process.env.MONGO_URI || process.env.MONGODB_URL));

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Setup allowed origins
const defaultOrigins = ["http://localhost:5173", "http://localhost:8080"];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

// Socket.IO setup
initIO(server, allowedOrigins);

// Middleware
app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/test", testEmailRoutes);
// Root route (always available)
app.get("/", (_req, res) => res.send("Server is running ✅. API is under /api. Health: /health"));
// Serve frontend (if built). Try ../frontend/dist (ts-node) and ../../frontend/dist (compiled)
const frontendCandidates = [
  path.resolve(__dirname, "..", "frontend", "dist"),
  path.resolve(__dirname, "..", "..", "frontend", "dist"),
];
let frontendDist: string | null = null;
for (const p of frontendCandidates) {
  if (fs.existsSync(path.join(p, "index.html"))) {
    frontendDist = p;
    break;
  }
}
if (frontendDist) {
  console.log("Serving frontend from:", frontendDist);
  app.use(express.static(frontendDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDist!, "index.html"));
  });
} else {
  console.log("Frontend dist not found. Skipping static serve. Build frontend or run it separately.");
}

// Health check
app.get("/health", (req, res) => res.send("Server is running ✅"));

// Self-ping to prevent cold start
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
