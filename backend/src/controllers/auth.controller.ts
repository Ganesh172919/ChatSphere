import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

const shouldUseSecureCookie = () => {
    const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
    if (override === "true") {
        return true;
    }

    if (override === "false") {
        return false;
    }

    const urls = [process.env.SERVER_URL, process.env.CLIENT_URL, process.env.CLIENT_URLS]
        .filter(Boolean)
        .flatMap((value) => String(value).split(","))
        .map((value) => value.trim())
        .filter(Boolean);

    if (!urls.length) {
        return process.env.NODE_ENV === "production";
    }

    return urls.every((value) => value.startsWith("https://"));
};

const setRefreshToken = (res: Response, token: string) => {
    const secure = shouldUseSecureCookie();

    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
}

const clearRefreshTokenCookie = (res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: shouldUseSecureCookie(),
        sameSite: "lax",
    });
};

// generting new acess token helper
export const refresh = async (req: any, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        clearRefreshTokenCookie(res);
        return res.status(200).json({
            success: true,
            data: null,
        });
    }

    try {
        const data = await authService.refreshAccessToken(refreshToken);

        return res.status(200).json({
            success: true,
            data,
        });

    } catch (error: any) {
        clearRefreshTokenCookie(res);
        return res.status(200).json({
            success: true,
            data: null,
        });
    }
};

// REGISTER
export const register = async (req: Request, res: Response) => {
    try {
        const user = await authService.registerUser(req.body);

        setRefreshToken(res, user.refreshToken);

        res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
    try {
        const data = await authService.loginUser(req.body);

        setRefreshToken(res, data.refreshToken);

        res.status(200).json({
            success: true,
            data: {
                accessToken: data.accessToken,
                user: data.user,
            },
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const logout = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;

        await authService.logoutUser(userId);

        clearRefreshTokenCookie(res);

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Logout failed",
        });
    }
};

export const me = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const user = await authService.getCurrentUser(req.user.userId);

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
