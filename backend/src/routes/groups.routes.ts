import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams } from "../middleware/validate.middleware";
import {
    getGroupMembers,
    removeGroupMember,
    updateGroupMemberRole,
} from "../services/room.service";

const router = Router();

const groupMemberParamsSchema = z.object({
    roomId: z.string().uuid(),
    userId: z.string().uuid(),
});

router.use(protect);

router.get(
    "/:roomId/members",
    validateParams(z.object({ roomId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const members = await getGroupMembers(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: members });
    })
);

router.put(
    "/:roomId/members/:userId/role",
    validateParams(groupMemberParamsSchema),
    validateBody(z.object({ role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]) })),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const targetUserId = String(req.params.userId);
        const result = await updateGroupMemberRole(
            req.user!.userId,
            roomId,
            targetUserId,
            req.body.role
        );

        res.status(200).json({ success: true, data: result, message: "Member role updated" });
    })
);

router.delete(
    "/:roomId/members/:userId",
    validateParams(groupMemberParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const targetUserId = String(req.params.userId);
        const result = await removeGroupMember(req.user!.userId, roomId, targetUserId);
        res.status(200).json({ success: true, data: result, message: "Member removed" });
    })
);

export default router;
