import { AppError } from "./app-error";

export const requireStringParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, "INVALID_ROUTE_PARAM", `Missing or invalid route parameter: ${name}`);
  }

  return value;
};
