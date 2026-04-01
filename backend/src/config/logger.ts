import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.refreshToken",
      "err.config.headers.Authorization",
      "*.accessToken",
      "*.refreshToken",
      "*.token"
    ],
    censor: "[REDACTED]"
  }
});
