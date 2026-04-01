import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";
import { roomsRouter } from "../modules/rooms/rooms.routes";
import { filesRouter } from "../modules/files/files.routes";
import { aiRouter } from "../modules/ai/ai.routes";
import { memoryRouter } from "../modules/memory/memory.routes";
import { healthRouter } from "../modules/health/health.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/rooms", roomsRouter);
apiRouter.use("/files", filesRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/memory", memoryRouter);
