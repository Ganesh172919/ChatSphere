import pinoHttp from "pino-http";
import { logger } from "../config/logger";

export const requestLogger = pinoHttp({
  logger,
  customSuccessMessage: (request, response) => `${request.method} ${request.url} completed with ${response.statusCode}`,
  customErrorMessage: (request, response) => `${request.method} ${request.url} failed with ${response.statusCode}`
});
