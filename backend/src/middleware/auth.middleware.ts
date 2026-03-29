import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email?: string;
        isAdmin?: boolean;
    };
}

const getAccessSecret = () =>
    process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : undefined;
        const token = bearerToken || req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token",
            });
        }

        const secret = getAccessSecret();
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "ACCESS/JWT secret not configured",
            });
        }

        const decoded = jwt.verify(token, secret) as {
            userId: string;
            email?: string;
            isAdmin?: boolean;
        };

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            isAdmin: decoded.isAdmin,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

export const protectAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }

    next();
};