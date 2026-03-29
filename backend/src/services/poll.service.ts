import { randomUUID } from "crypto";
import { Prisma, RoomMemberRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";

interface PollOption {
    id: string;
    label: string;
    votes: string[];
}

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const assertRoomMember = async (roomId: string, userId: string) => {
    const member = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    if (!member) {
        throw new AppError("You must join the room first", 403, "FORBIDDEN");
    }

    return member;
};

const parseOptions = (value: unknown): PollOption[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const record = item as Record<string, unknown>;
            return {
                id: String(record.id ?? randomUUID()),
                label: String(record.label ?? ""),
                votes: Array.isArray(record.votes)
                    ? record.votes.map((entry) => String(entry))
                    : [],
            };
        })
        .filter((item) => item.label.trim().length > 0);
};

const serializePoll = (poll: {
    id: string;
    question: string;
    options: unknown;
    allowMultipleVotes: boolean;
    anonymous: boolean;
    closed: boolean;
    expiresAt: Date | null;
    creatorId: string;
    roomId: string;
}) => {
    return {
        id: poll.id,
        roomId: poll.roomId,
        creatorId: poll.creatorId,
        question: poll.question,
        options: parseOptions(poll.options),
        allowMultipleVotes: poll.allowMultipleVotes,
        anonymous: poll.anonymous,
        closed: poll.closed,
        expiresAt: poll.expiresAt,
    };
};

const buildPollResponse = (poll: ReturnType<typeof serializePoll>, userId: string) => {
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);

    const options = poll.options.map((option) => {
        const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
        const hasVoted = option.votes.includes(userId);

        return {
            id: option.id,
            label: option.label,
            votes: poll.anonymous ? undefined : option.votes,
            voteCount: option.votes.length,
            percentage: Number(percentage.toFixed(2)),
            hasVoted,
        };
    });

    return {
        ...poll,
        options,
        totalVotes,
        hasVoted: options.some((option) => option.hasVoted),
    };
};

export const createPoll = async (
    userId: string,
    payload: {
        roomId: string;
        question: string;
        options: string[];
        allowMultipleVotes?: boolean;
        anonymous?: boolean;
        expiresAt?: string;
    }
) => {
    await assertRoomMember(payload.roomId, userId);

    const question = payload.question.trim();

    if (question.length < 5 || question.length > 300) {
        throw new AppError("Question must be between 5 and 300 characters", 400, "VALIDATION_ERROR");
    }

    const options = Array.from(
        new Set(payload.options.map((option) => option.trim()).filter(Boolean))
    );

    if (options.length < 2 || options.length > 10) {
        throw new AppError("Poll must have between 2 and 10 unique options", 400, "VALIDATION_ERROR");
    }

    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
        throw new AppError("Invalid poll expiry", 400, "VALIDATION_ERROR");
    }

    const poll = await prisma.poll.create({
        data: {
            roomId: payload.roomId,
            creatorId: userId,
            question,
            options: toJson(
                options.map((option) => ({
                    id: randomUUID(),
                    label: option,
                    votes: [],
                }))
            ),
            allowMultipleVotes: Boolean(payload.allowMultipleVotes),
            anonymous: Boolean(payload.anonymous),
            expiresAt,
        },
    });

    return buildPollResponse(serializePoll(poll), userId);
};

export const getPollsByRoom = async (userId: string, roomId: string) => {
    await assertRoomMember(roomId, userId);

    const polls = await prisma.poll.findMany({
        where: {
            roomId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return polls.map((poll) => buildPollResponse(serializePoll(poll), userId));
};

export const votePoll = async (
    userId: string,
    pollId: string,
    optionId: string
) => {
    const poll = await prisma.poll.findUnique({
        where: {
            id: pollId,
        },
    });

    if (!poll) {
        throw new AppError("Poll not found", 404, "NOT_FOUND");
    }

    await assertRoomMember(poll.roomId, userId);

    if (poll.closed) {
        throw new AppError("Poll is closed", 400, "POLL_CLOSED");
    }

    if (poll.expiresAt && poll.expiresAt.getTime() < Date.now()) {
        throw new AppError("Poll has expired", 400, "POLL_EXPIRED");
    }

    const options = parseOptions(poll.options);
    const targetOption = options.find((option) => option.id === optionId);

    if (!targetOption) {
        throw new AppError("Poll option not found", 404, "NOT_FOUND");
    }

    for (const option of options) {
        if (!poll.allowMultipleVotes || option.id === optionId) {
            const hasVote = option.votes.includes(userId);

            if (option.id === optionId) {
                option.votes = hasVote
                    ? option.votes.filter((vote) => vote !== userId)
                    : [...option.votes, userId];
                continue;
            }

            option.votes = option.votes.filter((vote) => vote !== userId);
        }
    }

    const updated = await prisma.poll.update({
        where: {
            id: pollId,
        },
        data: {
            options: toJson(options),
        },
    });

    return buildPollResponse(serializePoll(updated), userId);
};

export const closePoll = async (userId: string, pollId: string) => {
    const poll = await prisma.poll.findUnique({
        where: {
            id: pollId,
        },
    });

    if (!poll) {
        throw new AppError("Poll not found", 404, "NOT_FOUND");
    }

    const roomMember = await assertRoomMember(poll.roomId, userId);

    const hasPermission =
        poll.creatorId === userId ||
        roomMember.role === RoomMemberRole.ADMIN ||
        roomMember.role === RoomMemberRole.MODERATOR;

    if (!hasPermission) {
        throw new AppError("Only poll creator or room moderator/admin can close poll", 403, "FORBIDDEN");
    }

    const updated = await prisma.poll.update({
        where: {
            id: pollId,
        },
        data: {
            closed: true,
        },
    });

    return buildPollResponse(serializePoll(updated), userId);
};
