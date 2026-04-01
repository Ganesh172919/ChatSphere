import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useRoomStore } from '@/stores/room-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSocket } from '@/hooks/use-socket'
import { formatDate } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'
import { Pin, ScrollText } from 'lucide-react'

export function MessageList() {
  const { messages, activeRoom, typingUsers } = useRoomStore()
  const { user } = useAuthStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPinned, setShowPinned] = useState(false)

  useSocket(activeRoom?.id)

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages]
  )

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: typeof messages }[] = []
    let currentDate = ''

    for (const msg of messages) {
      const date = formatDate(msg.createdAt)
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }

    return groups
  }, [messages])

  const typingUsernames = useMemo(
    () => Array.from(typingUsers.values()),
    [typingUsers]
  )

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const handleTogglePinned = useCallback(() => {
    setShowPinned((prev) => !prev)
  }, [])

  if (!activeRoom) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-primary">
        <p className="text-text-muted">Select a room to start chatting</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-primary">
        <ScrollText className="mb-4 h-12 w-12 text-text-muted" />
        <p className="text-text-muted">No messages yet</p>
        <p className="mt-1 text-sm text-text-muted/60">
          Be the first to send a message!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-bg-primary">
      {pinnedMessages.length > 0 && (
        <div className="border-b border-bg-elevated px-4 py-2">
          <button
            onClick={handleTogglePinned}
            className="flex items-center gap-2 text-sm text-accent hover:text-accent/80"
          >
            <Pin className="h-4 w-4" />
            <span>
              {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
            </span>
          </button>
          {showPinned && (
            <div className="mt-2 space-y-2">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded bg-bg-secondary px-3 py-2 text-sm text-text-secondary"
                >
                  <span className="font-medium text-text-primary">
                    {msg.authorName}
                  </span>
                  : {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="my-4 flex items-center justify-center">
              <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-muted">
                {group.date}
              </span>
            </div>
            <div className="space-y-1">
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} currentUserId={user?.id ?? ''} />
              ))}
            </div>
          </div>
        ))}

        {typingUsernames.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-text-muted">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
