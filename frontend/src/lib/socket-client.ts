import { io, type Socket } from 'socket.io-client'
import type { Message, User } from '@/types'
import { apiClient } from './api-client'

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin

class SocketClient {
  private socket: Socket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  connect() {
    if (this.socket?.connected) return

    const tokens = apiClient.getTokens()
    if (!tokens?.accessToken) return

    this.socket = io(SOCKET_URL, {
      auth: { token: tokens.accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.setupListeners()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setupListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Socket connected')
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  authenticate() {
    this.socket?.emit('authenticate')
  }

  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId })
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', { roomId })
  }

  sendMessage(roomId: string, content: string, replyToId?: string, uploadId?: string) {
    this.socket?.emit('send_message', { roomId, content, replyToId, uploadId })
  }

  editMessage(roomId: string, messageId: string, newContent: string) {
    this.socket?.emit('edit_message', { roomId, messageId, newContent })
  }

  deleteMessage(roomId: string, messageId: string) {
    this.socket?.emit('delete_message', { roomId, messageId })
  }

  addReaction(roomId: string, messageId: string, emoji: string) {
    this.socket?.emit('add_reaction', { roomId, messageId, emoji })
  }

  markRead(roomId: string, messageIds: string[]) {
    this.socket?.emit('mark_read', { roomId, messageIds })
  }

  pinMessage(roomId: string, messageId: string) {
    this.socket?.emit('pin_message', { roomId, messageId })
  }

  unpinMessage(roomId: string, messageId: string) {
    this.socket?.emit('unpin_message', { roomId, messageId })
  }

  typingStart(roomId: string) {
    this.socket?.emit('typing_start', { roomId })
  }

  typingStop(roomId: string) {
    this.socket?.emit('typing_stop', { roomId })
  }

  triggerAI(roomId: string, prompt: string, modelId?: string) {
    this.socket?.emit('trigger_ai', { roomId, prompt, modelId })
  }

  onReceiveMessage(callback: (message: Message) => void) {
    this.socket?.on('receive_message', callback)
    return () => this.socket?.off('receive_message', callback)
  }

  onMessageEdited(callback: (message: Message) => void) {
    this.socket?.on('message_edited', callback)
    return () => this.socket?.off('message_edited', callback)
  }

  onMessageDeleted(callback: (message: Message) => void) {
    this.socket?.on('message_deleted', callback)
    return () => this.socket?.off('message_deleted', callback)
  }

  onReactionUpdate(callback: (message: Message) => void) {
    this.socket?.on('reaction_update', callback)
    return () => this.socket?.off('reaction_update', callback)
  }

  onMessagePinned(callback: (message: Message) => void) {
    this.socket?.on('message_pinned', callback)
    return () => this.socket?.off('message_pinned', callback)
  }

  onMessageUnpinned(callback: (message: Message) => void) {
    this.socket?.on('message_unpinned', callback)
    return () => this.socket?.off('message_unpinned', callback)
  }

  onTypingStart(callback: (data: { roomId: string; userId: string; username: string }) => void) {
    this.socket?.on('typing_start', callback)
    return () => this.socket?.off('typing_start', callback)
  }

  onTypingStop(callback: (data: { roomId: string; userId: string; username: string }) => void) {
    this.socket?.on('typing_stop', callback)
    return () => this.socket?.off('typing_stop', callback)
  }

  onUserJoined(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on('user_joined', callback)
    return () => this.socket?.off('user_joined', callback)
  }

  onUserLeft(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on('user_left', callback)
    return () => this.socket?.off('user_left', callback)
  }

  onRoomUsers(callback: (users: User[]) => void) {
    this.socket?.on('room_users', callback)
    return () => this.socket?.off('room_users', callback)
  }

  onUserStatusChange(callback: (data: { userId: string; status: string }) => void) {
    this.socket?.on('user_status_change', callback)
    return () => this.socket?.off('user_status_change', callback)
  }

  onMessageRead(callback: (data: { roomId: string; userId: string; receipts: unknown[] }) => void) {
    this.socket?.on('message_read', callback)
    return () => this.socket?.off('message_read', callback)
  }

  onAIThinking(callback: (data: { roomId: string; status: string }) => void) {
    this.socket?.on('ai_thinking', callback)
    return () => this.socket?.off('ai_thinking', callback)
  }

  onAIResponse(callback: (message: Message) => void) {
    this.socket?.on('ai_response', callback)
    return () => this.socket?.off('ai_response', callback)
  }

  onErrorMessage(callback: (data: { error: string }) => void) {
    this.socket?.on('error_message', callback)
    return () => this.socket?.off('error_message', callback)
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners()
    }
  }
}

export const socketClient = new SocketClient()
export default socketClient
