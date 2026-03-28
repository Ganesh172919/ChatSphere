import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CREATE GROUP CHAT
export const createGroupChat = async (data: {
    name: string;
    createdById: string;
    members?: string[]; // array of user IDs to add
}) => {
    const { name, createdById, members = [] } = data;

    if (!name || name.trim().length === 0) {
        throw new Error("Group name is required");
    }

    if (name.length > 100) {
        throw new Error("Group name cannot exceed 100 characters");
    }

    // Create the group chat
    const chat = await prisma.chat.create({
        data: {
            type: "GROUP",
            name,
            members: {
                create: [
                    // Add creator as ADMIN
                    {
                        userId: createdById,
                        role: "ADMIN",
                    },
                    // Add other members as MEMBER
                    ...members.map((userId) => ({
                        userId,
                        role: "MEMBER" as const,
                    })),
                ],
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });

    return {
        id: chat.id,
        name: chat.name,
        type: chat.type,
        createdAt: chat.createdAt,
        members: chat.members.map((member) => ({
            userId: member.user.id,
            userName: member.user.name,
            userEmail: member.user.email,
            role: member.role,
            joinedAt: member.joinedAt,
        })),
    };
};

// GET GROUP DETAILS
export const getGroupChat = async (chatId: string, userId: string) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            messages: {
                take: 50,
                orderBy: { createdAt: "desc" },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    // Check if user is member of this chat
    const isMember = chat.members.some((member) => member.userId === userId);
    if (!isMember) {
        throw new Error("Unauthorized: Not a member of this chat");
    }

    return {
        id: chat.id,
        name: chat.name,
        type: chat.type,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        members: chat.members.map((member) => ({
            userId: member.user.id,
            userName: member.user.name,
            userEmail: member.user.email,
            role: member.role,
            joinedAt: member.joinedAt,
        })),
        messages: chat.messages.reverse().map((msg) => ({
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

// GET ALL CHATS FOR A USER
export const getUserChats = async (userId: string) => {
    const chats = await prisma.chat.findMany({
        where: {
            members: {
                some: {
                    userId,
                },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                    sender: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    return chats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        type: chat.type,
        memberCount: chat.members.length,
        members: chat.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
        })),
        lastMessage: chat.messages[0]
            ? {
                  content: chat.messages[0].content,
                  senderName: chat.messages[0].sender.name,
                  createdAt: chat.messages[0].createdAt,
              }
            : null,
        updatedAt: chat.updatedAt,
    }));
};

// ADD MEMBER TO GROUP
export const addMemberToGroup = async (
    chatId: string,
    userIdToAdd: string,
    performedBy: string
) => {
    // Check if chat exists and performer is admin
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: true,
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("This is not a group chat");
    }

    const performerMember = chat.members.find((m) => m.userId === performedBy);
    if (!performerMember || performerMember.role !== "ADMIN") {
        throw new Error("Only group admins can add members");
    }

    // Check if user already a member
    const existingMember = chat.members.find((m) => m.userId === userIdToAdd);
    if (existingMember) {
        throw new Error("User is already a member of this group");
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
        where: { id: userIdToAdd },
    });

    if (!userExists) {
        throw new Error("User not found");
    }

    // Add member
    await prisma.chatMember.create({
        data: {
            userId: userIdToAdd,
            chatId,
            role: "MEMBER",
        },
    });

    return {
        success: true,
        message: `${userExists.name} added to the group`,
    };
};

// REMOVE MEMBER FROM GROUP
export const removeMemberFromGroup = async (
    chatId: string,
    userIdToRemove: string,
    performedBy: string
) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: true,
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("This is not a group chat");
    }

    // Only admins can remove members (unless removing themselves)
    if (performedBy !== userIdToRemove) {
        const performerMember = chat.members.find((m) => m.userId === performedBy);
        if (!performerMember || performerMember.role !== "ADMIN") {
            throw new Error("Only group admins can remove members");
        }
    }

    // Check if member exists
    const memberToRemove = chat.members.find((m) => m.userId === userIdToRemove);
    if (!memberToRemove) {
        throw new Error("User is not a member of this group");
    }

    // Can't remove the last admin
    const adminCount = chat.members.filter((m) => m.role === "ADMIN").length;
    if (memberToRemove.role === "ADMIN" && adminCount === 1) {
        throw new Error("Cannot remove the last admin from the group");
    }

    // Remove member
    await prisma.chatMember.delete({
        where: {
            userId_chatId: {
                userId: userIdToRemove,
                chatId,
            },
        },
    });

    return {
        success: true,
        message: "Member removed from the group",
    };
};

// UPDATE GROUP NAME
export const updateGroupName = async (
    chatId: string,
    newName: string,
    performedBy: string
) => {
    if (!newName || newName.trim().length === 0) {
        throw new Error("Group name is required");
    }

    if (newName.length > 100) {
        throw new Error("Group name cannot exceed 100 characters");
    }

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: true,
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("This is not a group chat");
    }

    // Only admins can update group name
    const performer = chat.members.find((m) => m.userId === performedBy);
    if (!performer || performer.role !== "ADMIN") {
        throw new Error("Only group admins can update group name");
    }

    const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data: {
            name: newName,
        },
    });

    return {
        id: updatedChat.id,
        name: updatedChat.name,
        success: true,
    };
};

// CHANGE MEMBER ROLE
export const changeMemberRole = async (
    chatId: string,
    userIdToChangeRole: string,
    newRole: "ADMIN" | "MEMBER",
    performedBy: string
) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: true,
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("This is not a group chat");
    }

    // Only admins can change roles
    const performer = chat.members.find((m) => m.userId === performedBy);
    if (!performer || performer.role !== "ADMIN") {
        throw new Error("Only group admins can change member roles");
    }

    // Check if member exists
    const memberToChange = chat.members.find((m) => m.userId === userIdToChangeRole);
    if (!memberToChange) {
        throw new Error("User is not a member of this group");
    }

    // Can't demote the last admin
    if (
        memberToChange.role === "ADMIN" &&
        newRole === "MEMBER" &&
        chat.members.filter((m) => m.role === "ADMIN").length === 1
    ) {
        throw new Error("Cannot demote the last admin");
    }

    const updatedMember = await prisma.chatMember.update({
        where: {
            userId_chatId: {
                userId: userIdToChangeRole,
                chatId,
            },
        },
        data: {
            role: newRole,
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    return {
        userId: updatedMember.userId,
        userName: updatedMember.user.name,
        userEmail: updatedMember.user.email,
        newRole: updatedMember.role,
        success: true,
    };
};

// DELETE GROUP CHAT
export const deleteGroupChat = async (chatId: string, performedBy: string) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: true,
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("This is not a group chat");
    }

    // Only admins can delete group
    const performer = chat.members.find((m) => m.userId === performedBy);
    if (!performer || performer.role !== "ADMIN") {
        throw new Error("Only group admins can delete the group");
    }

    // Delete all messages first (foreign key constraint)
    await prisma.message.deleteMany({
        where: { chatId },
    });

    // Delete all members
    await prisma.chatMember.deleteMany({
        where: { chatId },
    });

    // Delete the chat
    await prisma.chat.delete({
        where: { id: chatId },
    });

    return {
        success: true,
        message: "Group chat deleted successfully",
    };
};