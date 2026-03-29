export interface TokenPayload {
    userId: string;
    username: string;
    email: string;
    isAdmin: boolean;
}

export interface AuthContext extends TokenPayload {
    iat?: number;
    exp?: number;
}
