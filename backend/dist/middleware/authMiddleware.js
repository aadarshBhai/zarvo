"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuperAdmin = exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = await User_1.default.findById(decoded.id).select("-password");
            if (!user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }
            req.user = user;
            next();
        }
        catch (error) {
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    }
    else {
        res.status(401).json({ message: "No token, authorization denied" });
    }
};
exports.protect = protect;
const isAdmin = (req, res, next) => {
    const role = req.user?.role;
    if (role === 'admin' || role === 'super-admin')
        return next();
    return res.status(403).json({ message: 'Admin access required' });
};
exports.isAdmin = isAdmin;
const isSuperAdmin = (req, res, next) => {
    const role = req.user?.role;
    if (role === 'super-admin')
        return next();
    return res.status(403).json({ message: 'Super-admin access required' });
};
exports.isSuperAdmin = isSuperAdmin;
