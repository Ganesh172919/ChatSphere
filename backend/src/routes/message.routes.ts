import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage,
} from "../controllers/message.controller";

const router = Router();

// All routes are protected
router.use(protect);

// SEND MESSAGE TO CHAT
router.post("/:chatId/messages", sendMessage);

// GET MESSAGES FROM CHAT
router.get("/:chatId/messages", getMessages);

// DELETE MESSAGE
router.delete("/:messageId", deleteMessage);

// EDIT MESSAGE
router.patch("/:messageId", editMessage);

export default router;