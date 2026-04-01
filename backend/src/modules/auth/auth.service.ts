import { AuthProvider, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../helpers/app-error";
import { addDays } from "../../helpers/time";
import { passwordService } from "../../services/auth/password.service";
import { googleOAuthService } from "../../services/auth/google-oauth.service";
import { type JwtPayload, tokenService } from "../../services/auth/token.service";
import { env } from "../../config/env";

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const toSafeUser = (user: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string;
  isAdmin: boolean;
  authProvider: AuthProvider;
  presenceStatus: string;
  themeMode: string;
  customTheme: string;
  accentColor: string;
  notificationSound: boolean;
  notificationDesktop: boolean;
  notificationMentions: boolean;
  notificationReplies: boolean;
  smartRepliesEnabled: boolean;
  sentimentAnalysisEnabled: boolean;
  grammarCheckEnabled: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  isAdmin: user.isAdmin,
  authProvider: user.authProvider,
  presenceStatus: user.presenceStatus,
  lastSeenAt: user.lastSeenAt,
  settings: {
    themeMode: user.themeMode,
    customTheme: user.customTheme,
    accentColor: user.accentColor,
    notifications: {
      sound: user.notificationSound,
      desktop: user.notificationDesktop,
      mentions: user.notificationMentions,
      replies: user.notificationReplies
    },
    aiFeatures: {
      smartReplies: user.smartRepliesEnabled,
      sentimentAnalysis: user.sentimentAnalysisEnabled,
      grammarCheck: user.grammarCheckEnabled
    }
  },
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const createTokenPayload = (user: { id: string; email: string; username: string; isAdmin: boolean }): JwtPayload => ({
  sub: user.id,
  email: user.email,
  username: user.username,
  isAdmin: user.isAdmin
});

const createSession = async (user: { id: string; email: string; username: string; isAdmin: boolean }) => {
  const refreshToken = tokenService.signRefreshToken();
  const tokenHash = tokenService.hashRefreshToken(refreshToken);
  const expiresAt = addDays(new Date(), env.JWT_REFRESH_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  return {
    accessToken: tokenService.signAccessToken(createTokenPayload(user)),
    refreshToken
  };
};

const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  isAdmin: true,
  authProvider: true,
  presenceStatus: true,
  themeMode: true,
  customTheme: true,
  accentColor: true,
  notificationSound: true,
  notificationDesktop: true,
  notificationMentions: true,
  notificationReplies: true,
  smartRepliesEnabled: true,
  sentimentAnalysisEnabled: true,
  grammarCheckEnabled: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export const authService = {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }]
      },
      select: { id: true }
    });

    if (existingUser) {
      throw new AppError(409, "USER_ALREADY_EXISTS", "A user with that email or username already exists");
    }

    const passwordHash = await passwordService.hash(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
        displayName: input.displayName ?? input.username
      },
      select: userSelect
    });

    const tokens = await createSession(user);
    return { user: toSafeUser(user), tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        ...userSelect,
        passwordHash: true
      }
    });

    if (!user?.passwordHash) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const matches = await passwordService.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() }
    });

    const { passwordHash: _passwordHash, ...safeFields } = user;
    const tokens = await createSession(user);
    return { user: toSafeUser(safeFields), tokens };
  },

  async refresh(refreshToken: string) {
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    const existing = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: { select: userSelect }
      }
    });

    if (!existing) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date()
      }
    });

    const tokens = await createSession(existing.user);
    return { user: toSafeUser(existing.user), tokens };
  },

  async logout(refreshToken: string) {
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date()
      }
    });
  },

  async googleLogin(idToken: string) {
    const profile = await googleOAuthService.verifyIdToken(idToken);
    const usernameBase = profile.email.split("@")[0] ?? "google_user";
    const normalizedUsername = usernameBase.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30) || "google_user";
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl ?? null
      },
      create: {
        email: profile.email,
        username: normalizedUsername,
        googleId: profile.googleId,
        authProvider: AuthProvider.GOOGLE,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl ?? null
      },
      select: userSelect
    });

    const tokens = await createSession(user);
    return { user: toSafeUser(user), tokens };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return toSafeUser(user);
  }
};
