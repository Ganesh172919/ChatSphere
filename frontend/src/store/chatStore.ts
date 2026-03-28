import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConversationInsight, MemoryReference } from '../types/chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  messageState?: 'pending' | 'complete' | 'error';
  memoryRefs?: MemoryReference[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  modelId?: string | null;
  provider?: string | null;
  requestedModelId?: string | null;
  processingMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  autoMode?: boolean;
  autoComplexity?: string | null;
  fallbackUsed?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  project?: {
    id: string;
    name: string;
    description: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
  serverId?: string;
  sourceType?: string;
  sourceLabel?: string;
  insight?: ConversationInsight | null;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  addConversation: (conversation: Conversation) => void;
  upsertConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  setConversationMessages: (conversationId: string, messages: Message[]) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  updateConversationServerId: (conversationId: string, serverId: string) => void;
  updateConversationInsight: (conversationId: string, insight: ConversationInsight | null) => void;
  deleteConversation: (conversationId: string) => void;
  getActiveConversation: () => Conversation | undefined;
  loadConversations: (conversations: Conversation[]) => void;
}

function sortByUpdatedDate(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => {
    const left = new Date(a.updatedAt || a.createdAt).getTime();
    const right = new Date(b.updatedAt || b.createdAt).getTime();
    return right - left;
  });
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      addConversation: (conversation) =>
        set((state) => ({
          conversations: sortByUpdatedDate([conversation, ...state.conversations.filter((item) => item.id !== conversation.id)]),
          activeConversationId: conversation.id,
        })),
      upsertConversation: (conversation) =>
        set((state) => ({
          conversations: sortByUpdatedDate([
            conversation,
            ...state.conversations.filter((item) => item.id !== conversation.id),
          ]),
        })),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: sortByUpdatedDate(state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, message],
                  updatedAt: message.timestamp,
                }
              : conversation
          )),
        })),
      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          conversations: sortByUpdatedDate(state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: conversation.messages.map((message) =>
                    message.id === messageId ? { ...message, ...updates } : message
                  ),
                  updatedAt: updates.timestamp || conversation.updatedAt || conversation.createdAt,
                }
              : conversation
          )),
        })),
      setConversationMessages: (conversationId, messages) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages,
                  updatedAt: messages[messages.length - 1]?.timestamp || conversation.updatedAt || conversation.createdAt,
                }
              : conversation
          ),
        })),
      updateConversationTitle: (conversationId, title) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, title } : conversation
          ),
        })),
      updateConversationServerId: (conversationId, serverId) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, serverId } : conversation
          ),
        })),
      updateConversationInsight: (conversationId, insight) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, insight } : conversation
          ),
        })),
      deleteConversation: (conversationId) =>
        set((state) => {
          const conversations = state.conversations.filter((conversation) => conversation.id !== conversationId);
          return {
            conversations,
            activeConversationId:
              state.activeConversationId === conversationId
                ? conversations[0]?.id || null
                : state.activeConversationId,
          };
        }),
      getActiveConversation: () => {
        const state = get();
        return state.conversations.find((conversation) => conversation.id === state.activeConversationId);
      },
      loadConversations: (conversations) =>
        set((state) => ({
          conversations: sortByUpdatedDate(conversations),
          activeConversationId:
            state.activeConversationId && conversations.some((conversation) => conversation.id === state.activeConversationId)
              ? state.activeConversationId
              : conversations[0]?.id || null,
        })),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
