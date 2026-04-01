import { Router } from "express";
import { asyncHandler } from "../../helpers/async-handler";
import { validateBody } from "../../helpers/validation";
import { requireAuth } from "../../middleware/auth";
import { usersController } from "./users.controller";
import { updateProfileSchema, updateSettingsSchema } from "./users.schemas";

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.get("/me", asyncHandler(usersController.current));
usersRouter.patch("/me", validateBody(updateProfileSchema), asyncHandler(usersController.updateProfile));
usersRouter.patch("/me/settings", validateBody(updateSettingsSchema), asyncHandler(usersController.updateSettings));
usersRouter.get("/:userId/profile", asyncHandler(usersController.publicProfile));
