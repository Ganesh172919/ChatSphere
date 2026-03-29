import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

let io: Server | null = null;

const connectedUsers = new Map<string, Set<string>>();
const lastPresenceBroadcastAt = new Map<string, number>();

const getAccessSecret = () =>
    process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;

const setPresence = async (userId: string, isOnline: boolean) => {
    await prisma.userPresence.upsert({
        where: { userId },
        update: {
            isOnline,
            lastSeenAt: new Date(),
        },
        create: {
            userId,
            isOnline,
            lastSeenAt: new Date(),
        },
    });
};

const addConnection = (userId: string, socketId: string) => {
    const sockets = connectedUsers.get(userId) || new Set<string>();
    sockets.add(socketId);
    connectedUsers.set(userId, sockets);
};

const removeConnection = (userId: string, socketId: string) => {
    const sockets = connectedUsers.get(userId);
    if (!sockets) {
        return;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
        connectedUsers.delete(userId);
    }
};

const emitPresence = (userId: string, isOnline: boolean) => {
    const now = Date.now();
    const last = lastPresenceBroadcastAt.get(userId) || 0;

    if (now - last < 1200) {
        return;
    }

    lastPresenceBroadcastAt.set(userId, now);
    io?.emit("presence:update", { userId, isOnline, lastSeenAt: new Date().toISOString() });
};

const authenticateSocket = (socket: Socket): string | null => {
    const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.startsWith("Bearer ")
            ? socket.handshake.headers.authorization.slice(7)
            : undefined);

    if (!token) {
        return null;
    }

    const secret = getAccessSecret();
    if (!secret) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, secret) as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
};

export const initializeSocket = (server: HttpServer, allowedOrigins: string[] = []) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }

                callback(new Error(`Socket CORS blocked for origin: ${origin}`));
            },
            credentials: true,
        },
    });

    io.on("connection", async (socket) => {
        const userId = authenticateSocket(socket);
        const joinedChatIds = new Set<string>();

        if (!userId) {
            socket.emit("error", { message: "Unauthorized socket connection" });
            socket.disconnect(true);
            return;
        }

        socket.data.userId = userId;
        addConnection(userId, socket.id);
        await setPresence(userId, true);

        emitPresence(userId, true);

        socket.on("chat:join", async ({ chatId }: { chatId: string }) => {
            if (!chatId) {
                return;
            }

            const membership = await prisma.chatMember.findUnique({
                where: {
                    userId_chatId: {
                        userId,
                        chatId,
                    },
                },
            });

            if (!membership) {
                socket.emit("error", { message: "Not a chat member" });
                return;
            }

            socket.join(chatId);
            joinedChatIds.add(chatId);
            socket.to(chatId).emit("chat:member-joined", { chatId, userId });
        });

        socket.on("chat:leave", ({ chatId }: { chatId: string }) => {
            if (!chatId) {
                return;
            }

            socket.leave(chatId);
            joinedChatIds.delete(chatId);
            socket.to(chatId).emit("chat:member-left", { chatId, userId });
        });

        socket.on("typing:start", ({ chatId }: { chatId: string }) => {
            if (!chatId || !joinedChatIds.has(chatId)) {
                return;
            }

            socket.to(chatId).emit("typing:update", {
                chatId,
                userId,
                isTyping: true,
            });
        });

        socket.on("typing:stop", ({ chatId }: { chatId: string }) => {
            if (!chatId || !joinedChatIds.has(chatId)) {
                return;
            }

            socket.to(chatId).emit("typing:update", {
                chatId,
                userId,
                isTyping: false,
            });
        });

        socket.on("disconnect", async () => {
            removeConnection(userId, socket.id);
            const stillConnected = connectedUsers.has(userId);

            if (!stillConnected) {
                await setPresence(userId, false);
                emitPresence(userId, false);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }
    return io;
};
