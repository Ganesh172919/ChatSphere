import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(200).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal("").transform(() => undefined))
});

export const updateSettingsSchema = z.object({
  themeMode: z.enum(["LIGHT", "DARK", "SYSTEM"]).optional(),
  customTheme: z.string().trim().min(1).max(40).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  notifications: z
    .object({
      sound: z.boolean().optional(),
      desktop: z.boolean().optional(),
      mentions: z.boolean().optional(),
      replies: z.boolean().optional()
    })
    .optional(),
  aiFeatures: z
    .object({
      smartReplies: z.boolean().optional(),
      sentimentAnalysis: z.boolean().optional(),
      grammarCheck: z.boolean().optional()
    })
    .optional()
});
