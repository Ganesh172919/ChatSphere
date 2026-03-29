import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/token";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const hashToken = (token: string) => {
    return crypto.createHash("sha256").update(token).digest("hex");
}

const getRefreshSecret = () =>
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET;


// refresh
export const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new Error("No refresh token");
    }

    const refreshSecret = getRefreshSecret();
    if (!refreshSecret) {
        throw new Error("REFRESH token secret is not configured");
    }

    const decoded = jwt.verify(
        refreshToken,
        refreshSecret
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

    const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
    });

    return {
        accessToken: newAccessToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
        },
    };
};

// REGISTER
export const registerUser = async (data: {
    email: string;
    password: string;
    name?: string;
}) => {
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const name = data.name?.trim();

    if (!email || !email.includes("@")) {
        throw new Error("A valid email is required");
    }

    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    if (name && name.length > 60) {
        throw new Error("Name cannot exceed 60 characters");
    }

    // check existing user
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    const usersCount = await prisma.user.count();

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            isAdmin: usersCount === 0,
        },
    });

    const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
    });

    const refreshToken = generateRefreshToken(user.id);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            refreshToken: hashToken(refreshToken),
        },
    });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
        },
    };
};

// LOGIN
export const loginUser = async (data: {
    email: string;
    password: string;
}) => {
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!email || !password) {
        throw new Error("Email and password are required");
    }

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

    const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
    });
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
            isAdmin: user.isAdmin,
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

export const getCurrentUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            isAdmin: true,
            createdAt: true,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};