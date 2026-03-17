import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  serverId?: string; // MongoDB _id from backend
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  addConversation: (conv: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  updateConversationServerId: (conversationId: string, serverId: string) => void;
  deleteConversation: (conversationId: string) => void;
  getActiveConversation: () => Conversation | undefined;
  loadConversations: (conversations: Conversation[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      addConversation: (conv) =>
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversationId: conv.id,
        })),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message] }
              : c
          ),
        })),
      updateConversationTitle: (conversationId, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, title } : c
          ),
        })),
      updateConversationServerId: (conversationId, serverId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, serverId } : c
          ),
        })),
      deleteConversation: (conversationId) =>
        set((state) => {
          const newConversations = state.conversations.filter(
            (c) => c.id !== conversationId
          );
          return {
            conversations: newConversations,
            activeConversationId:
              state.activeConversationId === conversationId
                ? newConversations[0]?.id || null
                : state.activeConversationId,
          };
        }),
      getActiveConversation: () => {
        const state = get();
        return state.conversations.find(
          (c) => c.id === state.activeConversationId
        );
      },
      loadConversations: (conversations) =>
        set({ conversations }),
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
