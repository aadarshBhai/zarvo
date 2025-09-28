"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("./config/db"));
const socket_1 = require("./socket");
const User_1 = __importDefault(require("./models/User"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const slotRoutes_1 = __importDefault(require("./routes/slotRoutes"));
const testEmail_1 = __importDefault(require("./routes/testEmail"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
// Seed super-admin and admin users at startup
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
// Confirm environment variables
console.log("PORT:", process.env.PORT || 5000);
console.log("FRONTEND_URLS:", process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
console.log("DB URI exists?", !!(process.env.MONGO_URI || process.env.MONGODB_URL));
// Connect to MongoDB
(0, db_1.default)();
// Kick off admin seeding (non-blocking)
seedAdminUsers();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Seed super-admin and admin accounts (runs once if they do not exist)
async function seedAdminUsers() {
    try {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "zarvosuperadmin@gmail.com";
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "Aa1#Aa1#";
        const adminEmail = process.env.ADMIN_EMAIL || "zarvoadmin@gmail.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "Aa1#Aa1#";
        // Super Admin
        let superAdmin = await User_1.default.findOne({ email: superAdminEmail });
        if (!superAdmin) {
            superAdmin = await User_1.default.create({
                name: "Super Admin",
                email: superAdminEmail,
                password: superAdminPassword,
                role: "super-admin",
            });
            console.log("✅ Seeded super-admin:", superAdminEmail);
        }
        // Admin
        let admin = await User_1.default.findOne({ email: adminEmail });
        if (!admin) {
            admin = await User_1.default.create({
                name: "Admin",
                email: adminEmail,
                password: adminPassword,
                role: "admin",
            });
            console.log("✅ Seeded admin:", adminEmail);
        }
    }
    catch (err) {
        console.error("⚠️ Admin seeding failed:", err);
    }
}
// Allowed origins for CORS/Socket.IO
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';
const devDefaults = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
];
const allowedOrigins = [...new Set(envOrigins.length > 0 ? (isProd ? envOrigins : [...envOrigins, ...devDefaults]) : (isProd ? [] : devDefaults))];
// Socket.IO initialization
(0, socket_1.initIO)(server, allowedOrigins);
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
// API Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/bookings", bookingRoutes_1.default);
app.use("/api/slots", slotRoutes_1.default);
app.use("/api/test", testEmail_1.default);
app.use("/api/admin", adminRoutes_1.default);
// Health check endpoint
app.get("/health", (_req, res) => res.send("Server is running ✅"));
// Serve frontend
// Adjust path for Render: backend/dist -> ../../frontend/dist
const frontendDist = path_1.default.resolve(__dirname, "../../frontend/dist");
if (fs_1.default.existsSync(path_1.default.join(frontendDist, "index.html"))) {
    console.log("Serving frontend from:", frontendDist);
    app.use(express_1.default.static(frontendDist));
    // Catch-all route to serve index.html for SPA
    app.get("*", (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, "index.html"));
    });
}
else {
    console.log("Frontend dist not found. Build frontend first.");
}
// Self-ping to prevent cold start (optional)
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
