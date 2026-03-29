import passport from "passport";
import {
    Profile,
    Strategy as GoogleStrategy,
    StrategyOptions,
    VerifyCallback,
} from "passport-google-oauth20";
import { env } from "./env";
import { findOrCreateGoogleUser } from "../services/auth.service";
import { logger } from "../helpers/logger";
import { AuthContext } from "../types/auth";

let strategyConfigured = false;

export const configurePassport = (): void => {
    if (strategyConfigured) {
        return;
    }

    if (!env.googleClientId || !env.googleClientSecret) {
        logger.warn("Google OAuth not configured. Skipping passport Google strategy.");
        strategyConfigured = true;
        return;
    }

    const googleStrategyOptions: StrategyOptions = {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
        passReqToCallback: false,
    };

    passport.use(
        new GoogleStrategy(
            googleStrategyOptions,
            async (
                _accessToken: string,
                _refreshToken: string,
                profile: Profile,
                done: VerifyCallback
            ) => {
                try {
                    const email = profile.emails?.[0]?.value;

                    if (!email) {
                        throw new Error("Google profile email is missing");
                    }

                    const user = await findOrCreateGoogleUser({
                        googleId: profile.id,
                        email,
                        displayName: profile.displayName,
                        avatar: profile.photos?.[0]?.value,
                    });

                    const authContext: AuthContext = {
                        userId: user.id,
                        username: user.username,
                        email: user.email,
                        isAdmin: user.isAdmin,
                    };

                    done(null, authContext);
                } catch (error) {
                    done(error as Error);
                }
            }
        )
    );

    strategyConfigured = true;
};
