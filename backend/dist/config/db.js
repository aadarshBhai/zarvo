"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
        if (!uri) {
            throw new Error("Missing MONGO_URI or MONGODB_URL in environment variables");
        }
        await mongoose_1.default.connect(uri);
        console.log("MongoDB connected");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};
exports.default = connectDB;
