import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export const tokenService = {
  signAccessToken(payload: JwtPayload) {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"]
    } satisfies SignOptions);
  },
  signRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
  },
  verifyAccessToken(token: string) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  },
  hashRefreshToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
};
