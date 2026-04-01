import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { authenticateSocket } from "./socket-auth";
import { registerSocketHandlers } from "./register-socket-handlers";

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true
    }
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => registerSocketHandlers(io, socket));

  return io;
};
