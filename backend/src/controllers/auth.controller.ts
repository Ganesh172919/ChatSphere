import { Request, Response } from "express";
import * as authService from "../services/auth.service";

const setRefreshToken = (res: Response, token: string) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}

const clearRefreshTokenCookie = (res: Response) => {
    res.clearCookie("refreshToken");
};

// generting new acess token helper
export const refresh = async (req: any, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        const data = await authService.refreshAccessToken(refreshToken);

        res.status(200).json({
            success: true,
            accessToken: data.accessToken,
        });

    } catch (error: any) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};

// REGISTER
export const register = async (req: Request, res: Response) => {
    try {
        const user = await authService.registerUser(req.body);

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