import "express";
import { AuthContext } from "./auth";

declare global {
    namespace Express {
        interface User extends AuthContext {}

        interface Request {
            requestId: string;
            user?: User;
        }
    }
}

export {};
