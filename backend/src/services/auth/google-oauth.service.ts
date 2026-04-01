import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { AppError } from "../../helpers/app-error";

const client = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export interface GoogleProfile {
  email: string;
  googleId: string;
  displayName: string;
  avatarUrl?: string;
}

export const googleOAuthService = {
  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!client || !env.GOOGLE_CLIENT_ID) {
      throw new AppError(400, "GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth is not configured for this environment");
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new AppError(401, "INVALID_GOOGLE_TOKEN", "Google token payload is missing required fields");
    }

    return {
      email: payload.email,
      googleId: payload.sub,
      displayName: payload.name ?? payload.email.split("@")[0] ?? "google-user",
      avatarUrl: payload.picture ?? undefined
    };
  }
};
