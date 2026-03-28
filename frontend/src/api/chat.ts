import api from './axios';
import type { ConversationInsight, MemoryReference } from '../types/chat';

interface ChatMessage {
  role: string;
  parts: { text: string }[];
}

export interface ChatAttachment {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface ChatResponse {
  conversationId: string;
  role: string;
  content: string;
  timestamp: string;
  memoryRefs?: MemoryReference[];
  insight?: ConversationInsight | null;
  modelId?: string | null;
  provider?: string | null;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  conversationId?: string,
  modelId?: string,
  attachment?: ChatAttachment | null
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', {
    message,
    history,
    conversationId,
    modelId,
    attachment,
  });
  return data;
}
