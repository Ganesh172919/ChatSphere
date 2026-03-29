import * as chatService from "./chat.service";

type ChatRole = "ADMIN" | "MEMBER";

export const createGroupChat = async (data: {
    name: string;
    createdById: string;
    members?: string[];
    description?: string;
    aiModel?: string;
}) => {
    return chatService.createGroupChat(data);
};

export const getGroupChat = async (chatId: string, userId: string) => {
    const chat = await chatService.getChatDetails(chatId, userId);
    if (!chat) {
        throw new Error("Chat not found");
    }
    return chat;
};

export const getUserChats = async (userId: string) => {
    return chatService.listUserChats(userId);
};

export const addMemberToGroup = async (
    chatId: string,
    userIdToAdd: string,
    performedBy: string
) => {
    await chatService.addMember(chatId, performedBy, userIdToAdd);
    return {
        success: true,
        message: "Member added to group",
    };
};

export const removeMemberFromGroup = async (
    chatId: string,
    userIdToRemove: string,
    performedBy: string
) => {
    await chatService.removeMember(chatId, performedBy, userIdToRemove);
    return {
        success: true,
        message: "Member removed from group",
    };
};

export const updateGroupName = async (
    chatId: string,
    newName: string,
    performedBy: string
) => {
    return chatService.updateChat(chatId, performedBy, { name: newName });
};

export const changeMemberRole = async (
    chatId: string,
    userIdToChangeRole: string,
    newRole: ChatRole,
    performedBy: string
) => {
    return chatService.changeMemberRole(chatId, performedBy, userIdToChangeRole, newRole);
};

export const deleteGroupChat = async (chatId: string, performedBy: string) => {
    await chatService.deleteChat(chatId, performedBy);
    return {
        success: true,
        message: "Group chat deleted successfully",
    };
};