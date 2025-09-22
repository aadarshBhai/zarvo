"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
// Socket.io initialization is handled in ./socket
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("./config/db"));
const socket_1 = require("./socket");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const slotRoutes_1 = __importDefault(require("./routes/slotRoutes"));
const testEmail_1 = __importDefault(require("./routes/testEmail"));
const axios_1 = __importDefault(require("axios"));
// Load environment variables. Try ../.env (ts-node) then ../../.env (compiled dist)
const candidates = [
    path_1.default.resolve(__dirname, "..", ".env"),
    path_1.default.resolve(__dirname, "..", "..", ".env"),
];
let loadedEnv = false;
for (const p of candidates) {
    if (fs_1.default.existsSync(p)) {
        dotenv_1.default.config({ path: p });
        loadedEnv = true;
        break;
    }
}
if (!loadedEnv) {
    // Fallback to default lookup
    dotenv_1.default.config();
}
// Confirm environment variables
console.log("PORT:", process.env.PORT || 5000);
console.log("FRONTEND_URLS:", process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
console.log("DB URI exists?", !!(process.env.MONGO_URI || process.env.MONGODB_URL));
// Connect to MongoDB
(0, db_1.default)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Setup allowed origins
const defaultOrigins = ["http://localhost:5173", "http://localhost:8080"];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
// Socket.IO setup
(0, socket_1.initIO)(server, allowedOrigins);
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/bookings", bookingRoutes_1.default);
app.use("/api/slots", slotRoutes_1.default);
app.use("/api/test", testEmail_1.default);
// Root route (always available)
app.get("/", (_req, res) => res.send("Server is running ✅. API is under /api. Health: /health"));
// Serve frontend (if built). Try ../frontend/dist (ts-node) and ../../frontend/dist (compiled)
const frontendCandidates = [
    path_1.default.resolve(__dirname, "..", "frontend", "dist"),
    path_1.default.resolve(__dirname, "..", "..", "frontend", "dist"),
];
let frontendDist = null;
for (const p of frontendCandidates) {
    if (fs_1.default.existsSync(path_1.default.join(p, "index.html"))) {
        frontendDist = p;
        break;
    }
}
if (frontendDist) {
    console.log("Serving frontend from:", frontendDist);
    app.use(express_1.default.static(frontendDist));
    app.get("*", (req, res) => {
        res.sendFile(path_1.default.join(frontendDist, "index.html"));
    });
}
else {
    console.log("Frontend dist not found. Skipping static serve. Build frontend or run it separately.");
}
// Health check
app.get("/health", (req, res) => res.send("Server is running ✅"));
// Self-ping to prevent cold start
if (process.env.SELF_URL) {
    setInterval(() => {
        axios_1.default.get(process.env.SELF_URL)
            .then(() => console.log("✅ Self-ping successful"))
            .catch(() => console.log("⚠️ Self-ping failed"));
    }, 5 * 60 * 1000);
}
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
