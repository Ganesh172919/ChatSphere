import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { listModels, promptAI } from "../controllers/ai.controller";
import rateLimit from "express-rate-limit";

const router = Router();

const aiPromptLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: Number(process.env.AI_RATE_LIMIT_PER_MINUTE || "8"),
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many AI requests. Please wait a moment and try again.",
	},
});

router.use(protect);

router.get("/models", listModels);
router.post("/prompt", aiPromptLimiter, promptAI);

export default router;
