import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sendChatMessage, type ChatAttachment } from '../api/chat';
import {
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversationInsight,
  fetchConversations,
} from '../api/conversations';
import type { ProjectSummary } from '../api/projects';
import { useChatStore } from '../store/chatStore';
import type { Message } from '../store/chatStore';

function mapRole(role: string): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user';
}

function buildMessageId(role: string, timestamp: string, content: string) {
  return `${role}:${timestamp}:${content.slice(0, 24)}`;
}

export function useChat(activeProject?: ProjectSummary | null) {
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
    updateMessage,
    updateConversationInsight,
    updateConversationPreferences,
    updateConversationServerId,
  } = useChatStore();

  const syncConversations = useCallback(async () => {
    try {
      const summaries = await fetchConversations(activeProject?.id || undefined);
      loadConversations(summaries.map((summary) => ({
        id: summary.id,
        serverId: summary.id,
        title: summary.title,
        messages: [],
        project: summary.project || null,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        sourceType: summary.sourceType,
        sourceLabel: summary.sourceLabel,
        insight: null,
        preferredProvider: null,
        preferredModelId: null,
      })));
    } catch (error) {
      console.error('Failed to sync conversations', error);
    }
  }, [activeProject?.id, loadConversations]);

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
          id: buildMessageId(message.role, message.timestamp, message.content),
          role: mapRole(message.role),
          content: message.content,
          timestamp: message.timestamp,
          messageState: 'complete',
          memoryRefs: message.memoryRefs || [],
          fileUrl: message.fileUrl || null,
          fileName: message.fileName || null,
          fileType: message.fileType || null,
          fileSize: message.fileSize || null,
          modelId: message.modelId || null,
          provider: message.provider || null,
          requestedModelId: message.requestedModelId || null,
          processingMs: message.processingMs ?? null,
          promptTokens: message.promptTokens ?? null,
          completionTokens: message.completionTokens ?? null,
          totalTokens: message.totalTokens ?? null,
          autoMode: Boolean(message.autoMode),
          autoComplexity: message.autoComplexity || null,
          fallbackUsed: Boolean(message.fallbackUsed),
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
    async (
      content: string,
      options?: {
        modelId?: string;
        preferredProvider?: string | null;
        attachment?: ChatAttachment | null;
        project?: ProjectSummary | null;
      }
    ) => {
      let conversation = getActiveConversation();
      const selectedProject = options?.project || activeProject || null;

      if (!conversation) {
        const newConversation = {
          id: crypto.randomUUID(),
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          messages: [],
          project: selectedProject ? {
            id: selectedProject.id,
            name: selectedProject.name,
            description: selectedProject.description,
          } : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          insight: null,
          preferredProvider: options?.preferredProvider || null,
          preferredModelId: options?.modelId || null,
        };
        addConversation(newConversation);
        conversation = newConversation;
      }

      if (options?.preferredProvider || options?.modelId) {
        updateConversationPreferences(conversation.id, {
          preferredProvider: options?.preferredProvider || null,
          preferredModelId: options?.modelId || null,
        });
      }

      let historySource = conversation.messages;
      if (conversation.serverId && conversation.messages.length === 0) {
        try {
          const detail = await fetchConversation(conversation.serverId);
          historySource = detail.messages.map((message) => ({
            id: buildMessageId(message.role, message.timestamp, message.content),
            role: mapRole(message.role),
            content: message.content,
            timestamp: message.timestamp,
            messageState: 'complete',
            memoryRefs: message.memoryRefs || [],
            fileUrl: message.fileUrl || null,
            fileName: message.fileName || null,
            fileType: message.fileType || null,
            fileSize: message.fileSize || null,
            modelId: message.modelId || null,
            provider: message.provider || null,
            requestedModelId: message.requestedModelId || null,
            processingMs: message.processingMs ?? null,
            promptTokens: message.promptTokens ?? null,
            completionTokens: message.completionTokens ?? null,
            totalTokens: message.totalTokens ?? null,
            autoMode: Boolean(message.autoMode),
            autoComplexity: message.autoComplexity || null,
            fallbackUsed: Boolean(message.fallbackUsed),
          }));
          setConversationMessages(conversation.id, historySource);
        } catch (error) {
          console.error('Failed to refresh conversation before send', error);
        }
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        messageState: 'complete',
        fileUrl: options?.attachment?.fileUrl || null,
        fileName: options?.attachment?.fileName || null,
        fileType: options?.attachment?.fileType || null,
        fileSize: options?.attachment?.fileSize || null,
      };

      addMessage(conversation.id, userMessage);
      const assistantMessageId = crypto.randomUUID();
      addMessage(conversation.id, {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date().toISOString(),
        messageState: 'pending',
        requestedModelId: options?.modelId || 'auto',
        autoMode: !options?.modelId || options.modelId === 'auto',
      });
      setIsLoading(true);

      try {
        const history = historySource.map((message) => ({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }],
        }));

        const response = await sendChatMessage(
          content,
          history,
          conversation.serverId,
          options?.modelId,
          options?.attachment || null,
          selectedProject?.id || conversation.project?.id || null
        );

        if (response.conversationId && !conversation.serverId) {
          updateConversationServerId(conversation.id, response.conversationId);
        }

        updateMessage(conversation.id, assistantMessageId, {
          content: response.content,
          timestamp: response.timestamp,
          messageState: 'complete',
          memoryRefs: response.memoryRefs || [],
          modelId: response.modelId || null,
          provider: response.provider || null,
          requestedModelId: response.requestedModelId || options?.modelId || null,
          processingMs: response.processingMs ?? null,
          promptTokens: response.promptTokens ?? null,
          completionTokens: response.completionTokens ?? null,
          totalTokens: response.totalTokens ?? null,
          autoMode: Boolean(response.autoMode),
          autoComplexity: response.autoComplexity || null,
          fallbackUsed: Boolean(response.fallbackUsed),
        });
        updateConversationPreferences(conversation.id, {
          preferredProvider: response.provider || options?.preferredProvider || null,
          preferredModelId: response.modelId || options?.modelId || null,
        });
        updateConversationInsight(conversation.id, response.insight || null);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errMsg = err.response?.data?.error || err.message || 'Failed to get AI response';
        toast.error(errMsg);
        updateMessage(conversation.id, assistantMessageId, {
          content: 'Sorry, I hit an error while processing your request. Please try again.',
          timestamp: new Date().toISOString(),
          messageState: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      addConversation,
      addMessage,
      activeProject,
      getActiveConversation,
      setConversationMessages,
      updateMessage,
      updateConversationInsight,
      updateConversationPreferences,
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
