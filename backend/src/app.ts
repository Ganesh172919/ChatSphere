import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { ok } from "./helpers/api-response";
import { errorHandler } from "./middleware/error-handler";
import { notFoundMiddleware } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";
import { globalRateLimiter } from "./middleware/rate-limit";
import { apiRouter } from "./routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true
    })
  );
  app.use(requestLogger);
  app.use(globalRateLimiter);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/", (_request, response) => {
    response.json(
      ok({
        name: "ChatSphere Rebuild API",
        version: "1.0.0",
        docs: "/api/health"
      })
    );
  });

  app.use("/api", apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
};
