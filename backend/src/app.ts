import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";
import { env } from "./config/env";
import { configurePassport } from "./config/passport";
import { requestContext } from "./middleware/requestContext.middleware";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { registerRoutes } from "./routes";

export const createApp = () => {
    const app = express();

    app.disable("x-powered-by");

    app.use(requestContext);

    app.use(
        helmet({
            crossOriginResourcePolicy: false,
        })
    );

    app.use(
        cors({
            origin: env.clientUrl,
            credentials: env.corsCredentials,
        })
    );

    app.use(express.json({ limit: env.jsonBodyLimit }));
    app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));
    app.use(cookieParser());

    configurePassport();
    app.use(passport.initialize());

    app.use(apiLimiter);
    registerRoutes(app);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
