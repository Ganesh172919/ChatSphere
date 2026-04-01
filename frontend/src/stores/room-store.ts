import { create } from 'zustand'
import type { Room, Message, User } from '@/types'
import api from '@/lib/api-client'

interface RoomState {
  rooms: Room[]
  activeRoom: Room | null
  messages: Message[]
  onlineUsers: User[]
  typingUsers: Map<string, string>
  replyTo: Message | null
  isLoading: boolean
  fetchRooms: () => Promise<void>
  fetchRoom: (roomId: string) => Promise<void>
  fetchMessages: (roomId: string, limit?: number) => Promise<void>
  setActiveRoom: (room: Room | null) => void
  addMessage: (message: Message) => void
  updateMessage: (message: Message) => void
  removeMessage: (messageId: string) => void
  setOnlineUsers: (users: User[]) => void
  addTypingUser: (userId: string, username: string) => void
  removeTypingUser: (userId: string) => void
  createRoom: (data: { name: string; description?: string; visibility?: string; tags?: string[]; maxMembers?: number }) => Promise<Room>
  joinRoom: (roomId: string, userId: string) => Promise<void>
  leaveRoom: (roomId: string) => Promise<void>
  searchMessages: (roomId: string, query: string, limit?: number) => Promise<Message[]>
  toggleReaction: (roomId: string, messageId: string, emoji: string) => Promise<void>
  pinMessage: (roomId: string, messageId: string) => Promise<void>
  unpinMessage: (roomId: string, messageId: string) => Promise<void>
  markMessagesRead: (roomId: string, messageIds: string[]) => Promise<void>
  setReplyTo: (message: Message | null) => void
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: [],
  onlineUsers: [],
  typingUsers: new Map(),
  replyTo: null,
  isLoading: false,

  fetchRooms: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/rooms')
      const roomsList = data.data?.rooms ?? data.data ?? []
      set({ rooms: roomsList, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchRoom: async (roomId: string) => {
    try {
      const { data } = await api.get(`/rooms/${roomId}`)
      const room = data.data?.room ?? data.data
      set({ activeRoom: room })
      if (room?.messages) {
        set({ messages: room.messages })
      }
    } catch (error) {
      console.error('Failed to fetch room:', error)
    }
  },

  fetchMessages: async (roomId: string, limit = 50) => {
    if (!roomId) return
    try {
      const { data } = await api.get(`/rooms/${roomId}/messages`, { params: { limit } })
      const msgs = data.data?.messages ?? data.data ?? []
      set({ messages: msgs })
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  },

  setActiveRoom: (room: Room | null) => {
    set({ activeRoom: room })
    if (room?.id) {
      get().fetchMessages(room.id)
    } else {
      set({ messages: [] })
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  updateMessage: (message: Message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    }))
  },

  removeMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }))
  },

  setOnlineUsers: (users: User[]) => set({ onlineUsers: users }),

  addTypingUser: (userId: string, username: string) => {
    set((state) => {
      const newMap = new Map(state.typingUsers)
      newMap.set(userId, username)
      return { typingUsers: newMap }
    })
  },

  removeTypingUser: (userId: string) => {
    set((state) => {
      const newMap = new Map(state.typingUsers)
      newMap.delete(userId)
      return { typingUsers: newMap }
    })
  },

  createRoom: async (data) => {
    const { data: response } = await api.post('/rooms', data)
    const newRoom = response.data.room || response.data
    set((state) => ({ rooms: [...state.rooms, newRoom], activeRoom: newRoom }))
    get().fetchMessages(newRoom.id)
    return newRoom
  },

  joinRoom: async (roomId: string, userId: string) => {
    await api.post(`/rooms/${roomId}/members`, { userId })
    await get().fetchRooms()
  },

  leaveRoom: async (roomId: string) => {
    await api.delete(`/rooms/${roomId}/members/me`)
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
      activeRoom: state.activeRoom?.id === roomId ? null : state.activeRoom,
    }))
  },

  searchMessages: async (roomId: string, query: string, limit = 20) => {
    const { data } = await api.get('/rooms/search/messages', { params: { roomId, query, limit } })
    return data.data
  },

  toggleReaction: async (roomId: string, messageId: string, emoji: string) => {
    await api.post(`/rooms/${roomId}/messages/${messageId}/reactions`, { emoji })
  },

  pinMessage: async (roomId: string, messageId: string) => {
    await api.post(`/rooms/${roomId}/messages/${messageId}/pin`)
  },

  unpinMessage: async (roomId: string, messageId: string) => {
    await api.delete(`/rooms/${roomId}/messages/${messageId}/pin`)
  },

  markMessagesRead: async (roomId: string, messageIds: string[]) => {
    await api.post(`/rooms/${roomId}/messages/read`, { messageIds })
  },

  setReplyTo: (message: Message | null) => {
    set({ replyTo: message })
  },
}))
