import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware";
import { closePoll, createPoll, getPollsByRoom, votePoll } from "../services/poll.service";

const router = Router();

router.use(protect);

router.post(
    "/",
    validateBody(
        z.object({
            roomId: z.string().uuid(),
            question: z.string().min(5).max(300),
            options: z.array(z.string().min(1).max(120)).min(2).max(10),
            allowMultipleVotes: z.boolean().optional(),
            anonymous: z.boolean().optional(),
            expiresAt: z.string().datetime().optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const poll = await createPoll(req.user!.userId, req.body);
        res.status(201).json({ success: true, data: poll, message: "Poll created" });
    })
);

router.get(
    "/room/:roomId",
    validateParams(z.object({ roomId: z.string().uuid() })),
    validateQuery(z.object({})),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const polls = await getPollsByRoom(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: polls });
    })
);

router.post(
    "/:pollId/vote",
    validateParams(z.object({ pollId: z.string().uuid() })),
    validateBody(z.object({ optionId: z.string().min(1) })),
    asyncHandler(async (req, res) => {
        const pollId = String(req.params.pollId);
        const poll = await votePoll(req.user!.userId, pollId, req.body.optionId);
        res.status(200).json({ success: true, data: poll });
    })
);

router.post(
    "/:pollId/close",
    validateParams(z.object({ pollId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const pollId = String(req.params.pollId);
        const poll = await closePoll(req.user!.userId, pollId);
        res.status(200).json({ success: true, data: poll, message: "Poll closed" });
    })
);

export default router;
