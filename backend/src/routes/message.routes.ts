import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    sendMessage,
    getMessages,
    deleteMessage,
    editMessage,
    reactToMessage,
    pinMessage,
    votePoll,
    reportMessage,
} from "../controllers/message.controller";

const router = Router();

// All routes are protected
router.use(protect);

// SEND MESSAGE TO CHAT
router.post("/:chatId/messages", sendMessage);

// GET MESSAGES FROM CHAT
router.get("/:chatId/messages", getMessages);

// REACTION
router.post("/messages/:messageId/reactions", reactToMessage);

// PIN
router.post("/messages/:messageId/pin", pinMessage);

// POLL VOTE
router.post("/messages/:messageId/poll/vote", votePoll);

// MODERATION REPORT
router.post("/messages/:messageId/report", reportMessage);

// DELETE MESSAGE
router.delete("/:messageId", deleteMessage);

// EDIT MESSAGE
router.patch("/:messageId", editMessage);

export default router;