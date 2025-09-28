import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: Server | null = null;

export function initIO(server: HTTPServer, allowedOrigins: (string | RegExp)[]) {
  io = new Server(server, {
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

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initIO(server, ...) in server startup first.");
  }
  return io;
}
