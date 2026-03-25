import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET not defined");
}

export const generateAccessToken = (userId: string) => {
    return jwt.sign(
        { userId },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );
};

export const generateRefreshToken = (userId: string) => {
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};