import { useState, useEffect, useRef, useCallback } from 'react'
import { socketClient } from '@/lib/socket-client'
import { useRoomStore } from '@/stores/room-store'
import { useAuthStore } from '@/stores/auth-store'
import type { Message, User } from '@/types'

export function useSocket(roomId?: string) {
  const { user } = useAuthStore()
  const { addMessage, updateMessage, removeMessage, setOnlineUsers, addTypingUser, removeTypingUser } = useRoomStore()
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setupSocketListeners = useCallback(() => {
    if (!user) return

    const unsubscribers: (() => void)[] = []

    unsubscribers.push(
      socketClient.onReceiveMessage((message: Message) => {
        addMessage(message)
      })
    )

    unsubscribers.push(
      socketClient.onMessageEdited((message: Message) => {
        updateMessage(message)
      })
    )

    unsubscribers.push(
      socketClient.onMessageDeleted((message: Message) => {
        removeMessage(message.id)
      })
    )

    unsubscribers.push(
      socketClient.onReactionUpdate((message: Message) => {
        updateMessage(message)
      })
    )

    unsubscribers.push(
      socketClient.onMessagePinned((message: Message) => {
        updateMessage(message)
      })
    )

    unsubscribers.push(
      socketClient.onMessageUnpinned((message: Message) => {
        updateMessage(message)
      })
    )

    unsubscribers.push(
      socketClient.onTypingStart(({ userId, username }) => {
        if (userId !== user.id) {
          addTypingUser(userId, username)
        }
      })
    )

    unsubscribers.push(
      socketClient.onTypingStop(({ userId }) => {
        removeTypingUser(userId)
      })
    )

    unsubscribers.push(
      socketClient.onRoomUsers((users) => {
        setOnlineUsers(users)
      })
    )

    unsubscribers.push(
      socketClient.onUserStatusChange(({ userId, status }) => {
        const currentUsers = useRoomStore.getState().onlineUsers
        const updatedUsers = currentUsers.map((u: User) => u.id === userId ? { ...u, presenceStatus: status as User['presenceStatus'] } : u)
        setOnlineUsers(updatedUsers)
      })
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [user, addMessage, updateMessage, removeMessage, setOnlineUsers, addTypingUser, removeTypingUser])

  useEffect(() => {
    if (user && socketClient.isConnected()) {
      socketClient.authenticate()
      return setupSocketListeners()
    }
  }, [user, setupSocketListeners])

  useEffect(() => {
    if (roomId) {
      socketClient.joinRoom(roomId)
      return () => {
        socketClient.leaveRoom(roomId)
      }
    }
  }, [roomId])

  const handleTyping = useCallback(() => {
    if (!roomId) return
    socketClient.typingStart(roomId)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.typingStop(roomId)
    }, 2000)
  }, [roomId])

  return { handleTyping }
}
