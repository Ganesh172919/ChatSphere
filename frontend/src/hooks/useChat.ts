import { useState, useCallback } from 'react';
import { sendChatMessage } from '../api/chat';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../store/chatStore';
import toast from 'react-hot-toast';

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    addMessage,
    getActiveConversation,
    addConversation,
    setActiveConversation,
    updateConversationServerId,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string) => {
      let conversation = getActiveConversation();

      // Create new conversation if none active
      if (!conversation) {
        const newConv = {
          id: crypto.randomUUID(),
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          messages: [],
          createdAt: new Date().toISOString(),
        };
        addConversation(newConv);
        conversation = newConv;
      }

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      addMessage(conversation.id, userMessage);
      setIsLoading(true);

      try {
        // Build Gemini-format history from conversation
        const history = conversation.messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

        const response = await sendChatMessage(content, history, conversation.serverId);

        // Store the server conversation ID for future requests
        if (response.conversationId && !conversation.serverId) {
          updateConversationServerId(conversation.id, response.conversationId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: response.timestamp,
        };

        addMessage(conversation.id, assistantMessage);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errMsg = err.response?.data?.error || err.message || 'Failed to get AI response';
        toast.error(errMsg);
        const errorMessage: Message = {
          role: 'assistant',
          content: '⚠️ Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        };
        addMessage(conversation.id, errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, getActiveConversation, addConversation, updateConversationServerId]
  );

  const startNewChat = useCallback(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  return { sendMessage, isLoading, startNewChat };
}
