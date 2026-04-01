import { create } from 'zustand'
import type { MemoryEntry, Conversation } from '@/types'
import api from '@/lib/api-client'

interface AIState {
  memories: MemoryEntry[]
  conversations: Conversation[]
  activeConversation: Conversation | null
  isLoading: boolean
  isThinking: boolean
  fetchMemories: (query?: string, roomId?: string) => Promise<void>
  createMemory: (data: { summary: string; content: string; keywords: string[]; score?: number; roomId?: string }) => Promise<void>
  extractMemory: (content: string, roomId: string) => Promise<void>
  chatWithAI: (prompt: string, context?: string, roomId?: string) => Promise<{ role: string; content: string }>
  getSmartReplies: (prompt: string, roomId: string) => Promise<string[]>
  generateInsights: (text: string, roomId: string) => Promise<string>
}

export const useAIStore = create<AIState>()((set) => ({
  memories: [],
  conversations: [],
  activeConversation: null,
  isLoading: false,
  isThinking: false,

  fetchMemories: async (query?: string, roomId?: string) => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/memory', { params: { query, roomId, limit: 50 } })
      set({ memories: data.data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  createMemory: async (data) => {
    await api.post('/memory', data)
    await useAIStore.getState().fetchMemories()
  },

  extractMemory: async (content: string, roomId: string) => {
    await api.post('/memory/extract', { content, roomId })
    await useAIStore.getState().fetchMemories()
  },

  chatWithAI: async (prompt: string, context?: string, roomId?: string) => {
    set({ isThinking: true })
    try {
      const { data } = await api.post('/ai/chat', { prompt, context, roomId })
      const result = data.data
      set({ isThinking: false })
      return result
    } catch {
      set({ isThinking: false })
      throw new Error('AI chat failed')
    }
  },

  getSmartReplies: async (prompt: string, roomId: string) => {
    const { data } = await api.post('/ai/smart-replies', { prompt, roomId })
    return data.data.replies || []
  },

  generateInsights: async (text: string, roomId: string) => {
    const { data } = await api.post('/ai/insights', { text, roomId })
    return data.data.insights || ''
  },
}))
