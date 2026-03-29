import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import path from "path";
import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import messageRoutes from "./routes/message.routes";
import chatRoutes from "./routes/chat.routes";
import memoryRoutes from "./routes/memory.routes";
import insightRoutes from "./routes/insight.routes";
import aiRoutes from "./routes/ai.routes";
import adminRoutes from "./routes/admin.routes";
import fileRoutes from "./routes/file.routes";
import { prisma } from "./lib/prisma";
import { initializeSocket } from "./lib/socket";

dotenv.config();

const app = express();
const server = createServer(app);

const PORT = Number(process.env.PORT || 3000);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const parseAllowedOrigins = () =>
    [
        CLIENT_URL,
        ...(process.env.CLIENT_URLS || "").split(","),
        "http://localhost:8080",
    ]
        .map((origin) => origin.trim())
        .filter(Boolean);

const ALLOWED_ORIGINS = [
    ...new Set(parseAllowedOrigins()),
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/chats", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", fileRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "ChatSphere API running",
    });
});

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

app.get("/test-db", async (req, res) => {
    try {
        const users = await prisma.user.count();
        res.json({
            success: true,
            users,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "DB error" });
    }
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error?.message || "Internal server error";
    const statusCode =
        Number(error?.statusCode) ||
        Number(error?.status) ||
        (error?.code === "LIMIT_FILE_SIZE" ? 400 : 0) ||
        (message === "Unsupported file type" ? 400 : 0) ||
        500;

    return res.status(statusCode).json({
        success: false,
        message,
    });
});

app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

const bootstrap = async () => {
    try {
        await prisma.$connect();
        initializeSocket(server, ALLOWED_ORIGINS);

        server.listen(PORT, () => {
            console.log("Database connected");
            console.log(`Server running on port ${PORT}`);
            console.log(`Allowed client origins: ${ALLOWED_ORIGINS.join(", ")}`);
        });
    } catch (error) {
        console.error("DB connection failed:", error);
        process.exit(1);
    }
};

bootstrap();
