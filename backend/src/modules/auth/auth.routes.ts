import { Router } from "express";
import { asyncHandler } from "../../helpers/async-handler";
import { validateBody } from "../../helpers/validation";
import { requireAuth } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rate-limit";
import { authController } from "./auth.controller";
import { googleLoginSchema, loginSchema, refreshSchema, registerSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validateBody(registerSchema), asyncHandler(authController.register));
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", authRateLimiter, validateBody(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", validateBody(refreshSchema), asyncHandler(authController.logout));
authRouter.post("/google", authRateLimiter, validateBody(googleLoginSchema), asyncHandler(authController.googleLogin));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
