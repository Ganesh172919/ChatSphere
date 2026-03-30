import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";
import { AuthProvider, User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { TokenPayload } from "../types/auth";
import { env } from "../config/env";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "./token.service";
import { sendPasswordResetEmail } from "./email.service";

interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface GoogleProfileInput {
    googleId: string;
    email: string;
    displayName?: string;
    avatar?: string;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface GoogleExchangeEntry {
    userId: string;
    expiresAt: number;
}

const googleExchangeStore = new Map<string, GoogleExchangeEntry>();

const hashToken = (value: string): string => {
    return createHash("sha256").update(value).digest("hex");
};

const toSafeUser = (user: User) => {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        displayName: user.displayName,
        bio: user.bio,
        authProvider: user.authProvider,
        onlineStatus: user.onlineStatus,
        lastSeen: user.lastSeen,
        settings: user.settings,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
    };
};

const buildTokenPayload = (user: User): TokenPayload => {
    return {
        userId: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
    };
};

const issueTokenPair = async (user: User): Promise<TokenPair> => {
    const payload = buildTokenPayload(user);

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: hashedRefreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    return {
        accessToken,
        refreshToken,
    };
};

export const registerUser = async (input: RegisterInput) => {
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();

    if (username.length < 3 || username.length > 30) {
        throw new AppError("Username must be 3-30 characters", 400, "VALIDATION_ERROR");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new AppError("Valid email is required", 400, "VALIDATION_ERROR");
    }

    if (password.length < 6) {
        throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { username }],
        },
    });

    if (existing) {
        throw new AppError("Email or username already in use", 409, "CONFLICT");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash,
            authProvider: AuthProvider.LOCAL,
            displayName: username,
        },
    });

    const tokens = await issueTokenPair(user);

    return {
        user: toSafeUser(user),
        ...tokens,
    };
};

export const loginUser = async (input: LoginInput) => {
    const email = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (user.authProvider === AuthProvider.GOOGLE && !user.passwordHash) {
        throw new AppError(
            "This account uses Google login. Please continue with Google OAuth.",
            400,
            "GOOGLE_ACCOUNT_ONLY"
        );
    }

    if (!user.passwordHash) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);

    if (!isMatch) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const tokens = await issueTokenPair(user);

    return {
        user: toSafeUser(user),
        ...tokens,
    };
};

export const rotateRefreshToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new AppError("Refresh token is required", 401, "UNAUTHORIZED");
    }

    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const existing = await prisma.refreshToken.findFirst({
        where: {
            userId: decoded.userId,
            token: tokenHash,
            expiresAt: {
                gt: new Date(),
            },
        },
        include: {
            user: true,
        },
    });

    if (!existing) {
        throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const deleted = await prisma.refreshToken.deleteMany({
        where: {
            id: existing.id,
            userId: decoded.userId,
            token: tokenHash,
        },
    });

    if (deleted.count === 0) {
        throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const tokens = await issueTokenPair(existing.user);

    return {
        user: toSafeUser(existing.user),
        ...tokens,
    };
};

export const logoutUser = async (userId: string, refreshToken?: string) => {
    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);

        await prisma.refreshToken.deleteMany({
            where: {
                userId,
                token: tokenHash,
            },
        });

        return;
    }

    await prisma.refreshToken.deleteMany({
        where: {
            userId,
        },
    });
};

export const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    return toSafeUser(user);
};

export const requestPasswordReset = async (
    email: string,
    requestId?: string
): Promise<{ success: true }> => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });

    if (!user) {
        return {
            success: true,
        };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            resetPasswordToken: tokenHash,
            resetPasswordExpires: expiresAt,
        },
    });

    const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
        normalizedEmail
    )}`;

    await sendPasswordResetEmail(normalizedEmail, resetUrl, requestId);

    return {
        success: true,
    };
};

export const resetPassword = async (payload: {
    email: string;
    token: string;
    newPassword: string;
}) => {
    if (payload.newPassword.length < 6) {
        throw new AppError("Password must be at least 6 characters", 400, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({
        where: {
            email: payload.email.trim().toLowerCase(),
        },
    });

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
        throw new AppError("Invalid reset request", 400, "INVALID_RESET_TOKEN");
    }

    if (user.resetPasswordExpires.getTime() < Date.now()) {
        throw new AppError("Reset token expired", 400, "INVALID_RESET_TOKEN");
    }

    const tokenHash = hashToken(payload.token);

    if (tokenHash !== user.resetPasswordToken) {
        throw new AppError("Invalid reset token", 400, "INVALID_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10);

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            passwordHash,
            resetPasswordToken: null,
            resetPasswordExpires: null,
            authProvider: AuthProvider.LOCAL,
        },
    });

    await prisma.refreshToken.deleteMany({
        where: {
            userId: user.id,
        },
    });

    return {
        success: true,
    };
};

export const findOrCreateGoogleUser = async (input: GoogleProfileInput) => {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingByGoogle = await prisma.user.findUnique({
        where: {
            googleId: input.googleId,
        },
    });

    if (existingByGoogle) {
        return existingByGoogle;
    }

    const existingByEmail = await prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });

    if (existingByEmail) {
        return prisma.user.update({
            where: {
                id: existingByEmail.id,
            },
            data: {
                googleId: input.googleId,
                authProvider: AuthProvider.GOOGLE,
                displayName: input.displayName ?? existingByEmail.displayName,
                avatar: input.avatar ?? existingByEmail.avatar,
            },
        });
    }

    const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-z0-9_.-]/gi, "");
    const username = `${baseUsername || "user"}-${Math.floor(Math.random() * 100000)}`;

    return prisma.user.create({
        data: {
            username,
            email: normalizedEmail,
            googleId: input.googleId,
            authProvider: AuthProvider.GOOGLE,
            displayName: input.displayName || username,
            avatar: input.avatar,
            passwordHash: null,
        },
    });
};

export const createGoogleExchangeCode = (userId: string): string => {
    const code = randomUUID();

    googleExchangeStore.set(code, {
        userId,
        expiresAt: Date.now() + 60_000,
    });

    return code;
};

export const exchangeGoogleCode = async (code: string) => {
    const entry = googleExchangeStore.get(code);

    if (!entry || entry.expiresAt < Date.now()) {
        throw new AppError("Invalid or expired exchange code", 400, "INVALID_EXCHANGE_CODE");
    }

    googleExchangeStore.delete(code);

    const user = await prisma.user.findUnique({
        where: {
            id: entry.userId,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    const tokens = await issueTokenPair(user);

    return {
        user: toSafeUser(user),
        ...tokens,
    };
};

export const cleanupExpiredRefreshTokens = async () => {
    await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: {
                lte: new Date(),
            },
        },
    });
};
