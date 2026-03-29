import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    addMember,
    changeRole,
    createDirect,
    createGroup,
    createSolo,
    deleteChat,
    exportChat,
    getChat,
    importChat,
    listChats,
    onlineUsers,
    removeMember,
    searchUsers,
    updateChat,
} from "../controllers/chat.controller";

const router = Router();

router.use(protect);

router.get("/", listChats);
router.post("/group", createGroup);
router.post("/direct", createDirect);
router.post("/solo", createSolo);
router.post("/import", importChat);
router.get("/users/search", searchUsers);
router.get("/presence/online", onlineUsers);

router.get("/:chatId", getChat);
router.patch("/:chatId", updateChat);
router.delete("/:chatId", deleteChat);
router.get("/:chatId/export", exportChat);

router.post("/:chatId/members", addMember);
router.delete("/:chatId/members/:userId", removeMember);
router.patch("/:chatId/members/:userId/role", changeRole);

export default router;
