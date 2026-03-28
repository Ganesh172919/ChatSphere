import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string) => {
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    
    if (!ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET not defined");
    }
    
    return jwt.sign(
        { userId },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "24h" }
    );
};

export const generateRefreshToken = (userId: string) => {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
    
    if (!REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET not defined");
    }
    
    return jwt.sign(
        { userId },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};