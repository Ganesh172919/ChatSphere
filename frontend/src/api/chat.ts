import api from './axios';

interface ChatMessage {
  role: string;
  parts: { text: string }[];
}

interface ChatResponse {
  conversationId: string;
  role: string;
  content: string;
  timestamp: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  conversationId?: string
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', {
    message,
    history,
    conversationId,
  });
  return data;
}
