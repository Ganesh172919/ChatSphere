import { Router } from "express";
import passport from "passport";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { AppError } from "../helpers/errors";
import { env } from "../config/env";
import { protect } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
    createGoogleExchangeCode,
    exchangeGoogleCode,
    getMe,
    loginUser,
    logoutUser,
    registerUser,
    requestPasswordReset,
    resetPassword,
    rotateRefreshToken,
} from "../services/auth.service";

const router = Router();

const setRefreshCookie = (res: Parameters<typeof router.post>[1] extends never ? never : any, token: string) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: env.secureCookies,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

const clearRefreshCookie = (res: Parameters<typeof router.post>[1] extends never ? never : any) => {
    res.clearCookie("refreshToken");
};

router.post(
    "/register",
    authLimiter,
    validateBody(
        z.object({
            username: z.string().min(3).max(30),
            email: z.string().email(),
            password: z.string().min(6).max(200),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await registerUser(req.body);
        setRefreshCookie(res, result.refreshToken);
        res.status(201).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
            message: "Registration successful",
        });
    })
);

router.post(
    "/login",
    authLimiter,
    validateBody(
        z.object({
            email: z.string().email(),
            password: z.string().min(1).max(200),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await loginUser(req.body);
        setRefreshCookie(res, result.refreshToken);
        res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
            message: "Login successful",
        });
    })
);

router.post(
    "/refresh",
    authLimiter,
    validateBody(
        z.object({
            refreshToken: z.string().optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const incomingToken = req.body.refreshToken || req.cookies?.refreshToken;
        const result = await rotateRefreshToken(incomingToken);
        setRefreshCookie(res, result.refreshToken);

        res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
            message: "Token refreshed",
        });
    })
);

router.post(
    "/logout",
    protect,
    validateBody(
        z.object({
            refreshToken: z.string().optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        await logoutUser(req.user!.userId, refreshToken);
        clearRefreshCookie(res);

        res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    })
);

router.get(
    "/me",
    protect,
    asyncHandler(async (req, res) => {
        const user = await getMe(req.user!.userId);
        res.status(200).json({ success: true, data: user });
    })
);

router.post(
    "/forgot-password",
    authLimiter,
    validateBody(
        z.object({
            email: z.string().email(),
        })
    ),
    asyncHandler(async (req, res) => {
        await requestPasswordReset(req.body.email, req.requestId);

        res.status(200).json({
            success: true,
            message: "If that email exists, a reset link has been sent.",
        });
    })
);

router.post(
    "/reset-password",
    authLimiter,
    validateBody(
        z.object({
            email: z.string().email(),
            token: z.string().min(10),
            newPassword: z.string().min(6).max(200),
        })
    ),
    asyncHandler(async (req, res) => {
        await resetPassword(req.body);

        clearRefreshCookie(res);

        res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    })
);

router.get(
    "/google",
    (req, res, next) => {
        if (!env.googleClientId || !env.googleClientSecret) {
            next(new AppError("Google OAuth is not configured", 503, "OAUTH_UNAVAILABLE"));
            return;
        }

        passport.authenticate("google", {
            scope: ["profile", "email"],
            session: false,
        })(req, res, next);
    }
);

router.get(
    "/google/callback",
    (req, res, next) => {
        passport.authenticate(
            "google",
            {
                session: false,
            },
            (error: Error | null, user: { userId: string } | false) => {
                if (error || !user) {
                    next(new AppError("Google authentication failed", 401, "OAUTH_FAILED"));
                    return;
                }

                const exchangeCode = createGoogleExchangeCode(user.userId);

                if (req.query.mode === "json") {
                    res.status(200).json({
                        success: true,
                        data: {
                            code: exchangeCode,
                        },
                    });
                    return;
                }

                const redirectUrl = `${env.clientUrl}/oauth/google?code=${encodeURIComponent(
                    exchangeCode
                )}`;
                res.redirect(302, redirectUrl);
            }
        )(req, res, next);
    }
);

router.post(
    "/google/exchange",
    validateBody(
        z.object({
            code: z.string().uuid(),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await exchangeGoogleCode(req.body.code);
        setRefreshCookie(res, result.refreshToken);

        res.status(200).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    })
);

export default router;
