import { Router } from "express";
import {
    analytics,
    blockUser,
    createPrompt,
    deletePrompt,
    listBlocks,
    listFlags,
    listPrompts,
    unblockUser,
    updateFlag,
    updatePrompt,
} from "../controllers/admin.controller";
import { protect, protectAdmin } from "../middleware/auth.middleware";

const router = Router();

router.use(protect, protectAdmin);

router.get("/analytics", analytics);
router.get("/moderation", listFlags);
router.patch("/moderation/:flagId", updateFlag);

router.get("/prompts", listPrompts);
router.post("/prompts", createPrompt);
router.patch("/prompts/:promptId", updatePrompt);
router.delete("/prompts/:promptId", deletePrompt);

router.post("/blocks/:userId", blockUser);
router.delete("/blocks/:userId", unblockUser);
router.get("/blocks", listBlocks);

export default router;
