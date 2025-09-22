"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initIO = initIO;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
let io = null;
function initIO(server, allowedOrigins) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initIO(server, ...) in server startup first.");
    }
    return io;
}
