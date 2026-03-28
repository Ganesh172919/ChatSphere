import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// SEND MESSAGE
export const sendMessage = async (data: {
    chatId: string;
    senderId: string;
    content: string;
    type?: "TEXT" | "AI" | "FILE";
}) => {
    const { chatId, senderId, content, type = "TEXT" } = data;

    if (!content || content.trim().length === 0) {
        throw new Error("Message content is required");
    }

    if (content.length > 5000) {
        throw new Error("Message cannot exceed 5000 characters");
    }

    // Check if chat exists
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    // Check if user is a member of the chat
    const isMember = await prisma.chatMember.findUnique({
        where: {
            userId_chatId: {
                userId: senderId,
                chatId,
            },
        },
    });

    if (!isMember) {
        throw new Error("Unauthorized: Not a member of this chat");
    }

    // Create message
    const message = await prisma.message.create({
        data: {
            content,
            type,
            chatId,
            senderId,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
        where: { id: chatId },
        data: {
            updatedAt: new Date(),
        },
    });

    return {
        id: message.id,
        content: message.content,
        type: message.type,
        chatId: message.chatId,
        senderId: message.sender.id,
        senderName: message.sender.name,
        senderEmail: message.sender.email,
        createdAt: message.createdAt,
    };
};

// GET MESSAGES FROM CHAT
export const getMessages = async (
    chatId: string,
    userId: string,
    limit: number = 50,
    skip: number = 0
) => {
    // Check if chat exists
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    // Check if user is a member
    const isMember = await prisma.chatMember.findUnique({
        where: {
            userId_chatId: {
                userId,
                chatId,
            },
        },
    });

    if (!isMember) {
        throw new Error("Unauthorized: Not a member of this chat");
    }

    const messages = await prisma.message.findMany({
        where: { chatId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
    });

    return {
        total: messages.length,
        messages: messages.reverse().map((msg) => ({
            id: msg.id,
            content: msg.content,
            type: msg.type,
            senderId: msg.sender.id,
            senderName: msg.sender.name,
            senderEmail: msg.sender.email,
            createdAt: msg.createdAt,
        })),
    };
};

// DELETE MESSAGE
export const deleteMessage = async (
    messageId: string,
    userId: string
) => {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            chat: true,
        },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    // Only sender or chat admins can delete
    if (message.senderId !== userId) {
        const userRole = await prisma.chatMember.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId: message.chatId,
                },
            },
        });

        if (!userRole || userRole.role !== "ADMIN") {
            throw new Error("Unauthorized: Cannot delete this message");
        }
    }

    await prisma.message.delete({
        where: { id: messageId },
    });

    return {
        success: true,
        message: "Message deleted successfully",
    };
};

// EDIT MESSAGE
export const editMessage = async (
    messageId: string,
    newContent: string,
    userId: string
) => {
    if (!newContent || newContent.trim().length === 0) {
        throw new Error("Message content is required");
    }

    if (newContent.length > 5000) {
        throw new Error("Message cannot exceed 5000 characters");
    }

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    // Only sender can edit
    if (message.senderId !== userId) {
        throw new Error("Unauthorized: Cannot edit this message");
    }

    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
            content: newContent,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return {
        id: updatedMessage.id,
        content: updatedMessage.content,
        type: updatedMessage.type,
        senderId: updatedMessage.sender.id,
        senderName: updatedMessage.sender.name,
        senderEmail: updatedMessage.sender.email,
        createdAt: updatedMessage.createdAt,
        updated: true,
    };
};