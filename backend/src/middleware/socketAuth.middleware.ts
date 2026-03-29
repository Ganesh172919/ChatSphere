import { ExtendedError } from "socket.io";
import { Socket } from "socket.io";
import { verifyAccessToken } from "../services/token.service";
import { logger } from "../helpers/logger";

export const socketAuth = (
    socket: Socket,
    next: (err?: ExtendedError) => void
): void => {
    try {
        const authToken =
            (socket.handshake.auth?.token as string | undefined) ??
            socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!authToken) {
            throw new Error("Socket token missing");
        }

        const user = verifyAccessToken(authToken);
        socket.data.user = user;
        next();
    } catch (error) {
        logger.warn("Socket authentication failed", {
            socketId: socket.id,
            error,
        });
        next(new Error("Unauthorized socket connection"));
    }
};
