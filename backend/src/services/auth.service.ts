import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/token";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const hashToken = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
}


// refresh
export const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new Error("No refresh token");
    }

    const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!
    ) as { userId: string };

    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    });

    if (!user || !user.refreshToken) {
        throw new Error("Unauthorized");
    }

    const hashed = hashToken(refreshToken);

    if (hashed !== user.refreshToken) {
        throw new Error("Token mismatch");
    }

    const newAccessToken = generateAccessToken(user.id);

    return {
        accessToken: newAccessToken,
    };
};

// REGISTER
export const registerUser = async (data: {
    email: string;
    password: string;
    name?: string;
}) => {
    const { email, password, name } = data;

    // check existing user
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    });

    return {
        id: user.id,
        email: user.email,
        name: user.name,
    };
};

// LOGIN
export const loginUser = async (data: {
    email: string;
    password: string;
}) => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !user.password) {
        throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const hashedRefershToken = hashToken(refreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            refreshToken: hashedRefershToken,
        },
    });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
        },
    };
};

// logout
export const logoutUser = async (userId: string) => {
    await prisma.user.update({
        where: { id: userId },
        data: {
            refreshToken: null,
        },
    });
};