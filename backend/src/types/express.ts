import type { JwtPayload } from "../services/auth/token.service";

export interface AuthenticatedUser extends JwtPayload {}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
