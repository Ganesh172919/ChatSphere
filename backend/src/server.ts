import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import messageRoutes from "./routes/message.routes";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/chats", messageRoutes);

app.get("/", (req, res) => {
    res.send("API Running");
});

// db test route
app.get("/test-db", async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "DB error" });
    }
});

app.listen(PORT, async () => {
    try {
        await prisma.$connect();
        console.log(" Database connected");
        console.log(` Server running on port ${PORT}`);
    } catch (error) {
        console.error(" DB connection failed:", error);
    }
});