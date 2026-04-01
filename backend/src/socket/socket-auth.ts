import type { Socket } from "socket.io";
import { AppError } from "../helpers/app-error";
import { tokenService } from "../services/auth/token.service";

export interface SocketUser {
  sub: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export const authenticateSocket = (socket: Socket, next: (error?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string" || token.length < 10) {
      throw new AppError(401, "SOCKET_AUTH_REQUIRED", "Socket authentication token is required");
    }

    socket.data.user = tokenService.verifyAccessToken(token) as SocketUser;
    return next();
  } catch {
    return next(new Error("Socket authentication failed"));
  }
};
