import { AuthContext } from "./auth";

export interface SocketEventPayload<T = Record<string, unknown>> {
    event: string;
    data: T;
}

export interface SocketAuthData {
    user: AuthContext;
}
