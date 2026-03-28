import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
    createGroup,
    getGroup,
    getUserChats,
    addMember,
    removeMember,
    updateGroup,
    changeMemberRole,
    deleteGroup,
} from "../controllers/group.controller";

const router = Router();

// All routes are protected
router.use(protect);

// CREATE GROUP
router.post("/", createGroup);

// GET ALL USER'S CHATS
router.get("/user/chats", getUserChats);

// GET GROUP DETAILS
router.get("/:groupId", getGroup);

// UPDATE GROUP NAME
router.patch("/:groupId", updateGroup);

// DELETE GROUP
router.delete("/:groupId", deleteGroup);

// ADD MEMBER TO GROUP
router.post("/:groupId/members", addMember);

// REMOVE MEMBER FROM GROUP
router.delete("/:groupId/members", removeMember);

// CHANGE MEMBER ROLE
router.patch("/:groupId/members/role", changeMemberRole);

export default router;