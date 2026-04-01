import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(60).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(20)
});
