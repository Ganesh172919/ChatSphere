import { Router } from "express";
import { asyncHandler } from "../../helpers/async-handler";
import { validateBody, validateQuery } from "../../helpers/validation";
import { requireAuth } from "../../middleware/auth";
import { memoryController } from "./memory.controller";
import { createMemorySchema, extractMemorySchema, listMemoryQuerySchema } from "./memory.schemas";

export const memoryRouter = Router();

memoryRouter.use(requireAuth);
memoryRouter.get("/", validateQuery(listMemoryQuerySchema), asyncHandler(memoryController.list));
memoryRouter.post("/", validateBody(createMemorySchema), asyncHandler(memoryController.create));
memoryRouter.post("/extract", validateBody(extractMemorySchema), asyncHandler(memoryController.extract));
