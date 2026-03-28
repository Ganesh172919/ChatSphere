import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sendChatMessage } from '../api/chat';
import {
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversationInsight,
  fetchConversations,
} from '../api/conversations';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../store/chatStore';

function mapRole(role: string): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user';
}

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    addConversation,
    addMessage,
    conversations,
    deleteConversation,
    getActiveConversation,
    loadConversations,
    setActiveConversation,
    setConversationMessages,
    updateConversationInsight,
    updateConversationServerId,
  } = useChatStore();

  const syncConversations = useCallback(async () => {
    try {
      const summaries = await fetchConversations();
      loadConversations(summaries.map((summary) => ({
        id: summary.id,
        serverId: summary.id,
        title: summary.title,
        messages: [],
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        sourceType: summary.sourceType,
        sourceLabel: summary.sourceLabel,
        insight: null,
      })));
    } catch (error) {
      console.error('Failed to sync conversations', error);
    }
  }, [loadConversations]);

  useEffect(() => {
    void syncConversations();
  }, [syncConversations]);

  useEffect(() => {
    const activeConversation = getActiveConversation();
    if (!activeConversation?.serverId || activeConversation.messages.length > 0) {
      return;
    }

    let cancelled = false;

    const loadConversationDetail = async () => {
      try {
        const [detail, insight] = await Promise.all([
          fetchConversation(activeConversation.serverId as string),
          fetchConversationInsight(activeConversation.serverId as string).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const messages: Message[] = detail.messages.map((message) => ({
          role: mapRole(message.role),
          content: message.content,
          timestamp: message.timestamp,
          memoryRefs: message.memoryRefs || [],
        }));

        setConversationMessages(activeConversation.id, messages);
        updateConversationInsight(activeConversation.id, insight);
      } catch (error) {
        console.error('Failed to load conversation detail', error);
      }
    };

    void loadConversationDetail();

    return () => {
      cancelled = true;
    };
  }, [conversations, getActiveConversation, setConversationMessages, updateConversationInsight]);

  const sendMessage = useCallback(
    async (content: string) => {
      let conversation = getActiveConversation();

      if (!conversation) {
        const newConversation = {
          id: crypto.randomUUID(),
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          insight: null,
        };
        addConversation(newConversation);
        conversation = newConversation;
      }

      let historySource = conversation.messages;
      if (conversation.serverId && conversation.messages.length === 0) {
        try {
          const detail = await fetchConversation(conversation.serverId);
          historySource = detail.messages.map((message) => ({
            role: mapRole(message.role),
            content: message.content,
            timestamp: message.timestamp,
            memoryRefs: message.memoryRefs || [],
          }));
          setConversationMessages(conversation.id, historySource);
        } catch (error) {
          console.error('Failed to refresh conversation before send', error);
        }
      }

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      addMessage(conversation.id, userMessage);
      setIsLoading(true);

      try {
        const history = historySource.map((message) => ({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }],
        }));

        const response = await sendChatMessage(content, history, conversation.serverId);

        if (response.conversationId && !conversation.serverId) {
          updateConversationServerId(conversation.id, response.conversationId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: response.timestamp,
          memoryRefs: response.memoryRefs || [],
        };

        addMessage(conversation.id, assistantMessage);
        updateConversationInsight(conversation.id, response.insight || null);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errMsg = err.response?.data?.error || err.message || 'Failed to get AI response';
        toast.error(errMsg);
        addMessage(conversation.id, {
          role: 'assistant',
          content: 'Sorry, I hit an error while processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      addConversation,
      addMessage,
      getActiveConversation,
      setConversationMessages,
      updateConversationInsight,
      updateConversationServerId,
    ]
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      const conversation = conversations.find((item) => item.id === conversationId);
      try {
        if (conversation?.serverId) {
          await deleteConversationRequest(conversation.serverId);
        }
      } catch (error) {
        console.error('Failed to delete conversation from server', error);
        toast.error('Failed to delete conversation');
        return;
      }

      deleteConversation(conversationId);
    },
    [conversations, deleteConversation]
  );

  const startNewChat = useCallback(() => {
    setActiveConversation(null);
  }, [setActiveConversation]);

  return {
    sendMessage,
    isLoading,
    removeConversation,
    startNewChat,
    syncConversations,
  };
}
