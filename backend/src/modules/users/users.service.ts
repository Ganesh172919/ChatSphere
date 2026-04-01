import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../helpers/app-error";

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

const toSafeUser = (user: Prisma.UserGetPayload<{ select: typeof userSelect }>) => ({
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

export const usersService = {
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return toSafeUser(user);
  },

  async getPublicProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        presenceStatus: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return user;
  },

  async updateProfile(
    userId: string,
    input: { displayName?: string; bio?: string; avatarUrl?: string | undefined }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName,
        bio: input.bio,
        avatarUrl: input.avatarUrl
      },
      select: userSelect
    });

    return toSafeUser(user);
  },

  async updateSettings(
    userId: string,
    input: {
      themeMode?: "LIGHT" | "DARK" | "SYSTEM";
      customTheme?: string;
      accentColor?: string;
      notifications?: {
        sound?: boolean;
        desktop?: boolean;
        mentions?: boolean;
        replies?: boolean;
      };
      aiFeatures?: {
        smartReplies?: boolean;
        sentimentAnalysis?: boolean;
        grammarCheck?: boolean;
      };
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        themeMode: input.themeMode,
        customTheme: input.customTheme,
        accentColor: input.accentColor,
        notificationSound: input.notifications?.sound,
        notificationDesktop: input.notifications?.desktop,
        notificationMentions: input.notifications?.mentions,
        notificationReplies: input.notifications?.replies,
        smartRepliesEnabled: input.aiFeatures?.smartReplies,
        sentimentAnalysisEnabled: input.aiFeatures?.sentimentAnalysis,
        grammarCheckEnabled: input.aiFeatures?.grammarCheck
      },
      select: userSelect
    });

    return toSafeUser(user);
  }
};
