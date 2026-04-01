import { useState, useCallback, useRef } from 'react'
import { socketClient } from '@/lib/socket-client'

export function useTyping(roomId?: string) {
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTyping = useCallback(() => {
    if (!roomId) return

    if (!isTyping) {
      socketClient.typingStart(roomId)
      setIsTyping(true)
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      socketClient.typingStop(roomId)
      setIsTyping(false)
    }, 2000)
  }, [roomId, isTyping])

  const stopTyping = useCallback(() => {
    if (roomId && isTyping) {
      socketClient.typingStop(roomId)
      setIsTyping(false)
    }
  }, [roomId, isTyping])

  return { handleTyping, stopTyping, isTyping }
}
