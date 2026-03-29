import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { generateInsights, getInsights } from "../controllers/insight.controller";

const router = Router();

router.use(protect);

router.get("/:chatId", getInsights);
router.post("/:chatId/generate", generateInsights);

export default router;
