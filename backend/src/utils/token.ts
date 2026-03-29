import jwt from "jsonwebtoken";

const getAccessSecret = () =>
    process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;

const getRefreshSecret = () =>
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET;

export const generateAccessToken = (payload: {
    userId: string;
    email?: string;
    isAdmin?: boolean;
}) => {
    const ACCESS_TOKEN_SECRET = getAccessSecret();

    if (!ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET/JWT_ACCESS_SECRET not defined");
    }

    return jwt.sign(
        payload,
        ACCESS_TOKEN_SECRET,
        { expiresIn: "24h" }
    );
};

export const generateRefreshToken = (userId: string) => {
    const REFRESH_TOKEN_SECRET = getRefreshSecret();

    if (!REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET/JWT_REFRESH_SECRET not defined");
    }

    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};