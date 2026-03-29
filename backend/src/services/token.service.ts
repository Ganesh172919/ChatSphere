import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { TokenPayload, AuthContext } from "../types/auth";

export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.accessTokenSecret, {
        expiresIn: env.accessTokenTtl as SignOptions["expiresIn"],
    });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.refreshTokenSecret, {
        expiresIn: env.refreshTokenTtl as SignOptions["expiresIn"],
    });
};

export const verifyAccessToken = (token: string): AuthContext => {
    return jwt.verify(token, env.accessTokenSecret) as AuthContext;
};

export const verifyRefreshToken = (token: string): AuthContext => {
    return jwt.verify(token, env.refreshTokenSecret) as AuthContext;
};
