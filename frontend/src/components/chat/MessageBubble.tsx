import { useState, useCallback } from 'react'
import type { Message } from '@/types'
import { socketClient } from '@/lib/socket-client'
import { EMOJI_MAP, formatTime, getInitials } from '@/lib/utils'
import { useRoomStore } from '@/stores/room-store'
import { ReactionPicker } from './ReactionPicker'
import { Reply, Edit2, Trash2, Pin, Paperclip } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  currentUserId: string
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const { activeRoom } = useRoomStore()
  const [showPicker, setShowPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  const isSelf = message.authorId === currentUserId

  const reactionCounts: Record<string, number> = {}
  if (message.reactions) {
    for (const r of message.reactions) {
      const emoji = EMOJI_MAP[r.emoji] ?? r.emoji
      reactionCounts[emoji] = (reactionCounts[emoji] ?? 0) + 1
    }
  }

  const handleReaction = useCallback(
    (emoji: string) => {
      if (!activeRoom) return
      const emojiKey = Object.entries(EMOJI_MAP).find(([, v]) => v === emoji)?.[0] ?? emoji
      socketClient.addReaction(activeRoom.id, message.id, emojiKey)
      setShowPicker(false)
    },
    [activeRoom, message.id]
  )

  const handlePin = useCallback(() => {
    if (!activeRoom) return
    if (message.isPinned) {
      socketClient.unpinMessage(activeRoom.id, message.id)
    } else {
      socketClient.pinMessage(activeRoom.id, message.id)
    }
  }, [activeRoom, message.id, message.isPinned])

  const handleEdit = useCallback(() => {
    if (!activeRoom || editContent.trim() === message.content) {
      setIsEditing(false)
      return
    }
    socketClient.editMessage(activeRoom.id, message.id, editContent.trim())
    setIsEditing(false)
  }, [activeRoom, message.id, editContent, message.content])

  const handleDelete = useCallback(() => {
    if (!activeRoom) return
    socketClient.deleteMessage(activeRoom.id, message.id)
  }, [activeRoom, message.id])

  const handleReply = useCallback(() => {
    if (!activeRoom) return
    useRoomStore.setState({ replyTo: message })
  }, [activeRoom, message])

  const parentMessage = message.parentMessageId
    ? null
    : null

  return (
    <div
      className={`group relative flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`relative max-w-[70%] rounded-lg px-3 py-2 ${
          isSelf
            ? 'bg-accent text-white'
            : 'bg-bg-secondary text-text-primary'
        }`}
        onMouseEnter={() => setShowPicker(true)}
        onMouseLeave={() => setShowPicker(false)}
      >
        {message.parentMessageId && message.upload && (
          <div
            className={`mb-2 rounded border-l-2 border-accent/50 px-2 py-1 text-xs ${
              isSelf ? 'bg-white/10' : 'bg-bg-primary'
            }`}
          >
            <span className="font-medium">
              {message.authorName}
            </span>
            <p className="truncate">{message.content}</p>
          </div>
        )}

        <div className="flex items-start gap-2">
          {!isSelf && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
              {getInitials(message.authorName)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {!isSelf && (
              <span className="text-xs font-medium text-accent">
                {message.authorName}
              </span>
            )}

            {isEditing ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onBlur={handleEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit()
                    if (e.key === 'Escape') {
                      setIsEditing(false)
                      setEditContent(message.content)
                    }
                  }}
                  className="w-full rounded bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none ring-1 ring-accent"
                  autoFocus
                />
              </div>
            ) : (
              <p className="break-words text-sm">{message.content}</p>
            )}

            {message.upload && (
              <div
                className={`mt-2 flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  isSelf ? 'bg-white/10' : 'bg-bg-primary'
                }`}
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate">{message.upload.originalName}</span>
              </div>
            )}

            <div className="mt-1 flex items-center gap-2">
              {message.isPinned && (
                <Pin className="h-3 w-3 text-accent" />
              )}
              <span
                className={`text-[10px] ${
                  isSelf ? 'text-white/60' : 'text-text-muted'
                }`}
              >
                {formatTime(message.createdAt)}
                {message.editedAt && ' (edited)'}
              </span>
            </div>
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isSelf
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'bg-bg-primary hover:bg-bg-primary/80'
                }`}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        <div
          className={`absolute -top-8 right-0 hidden items-center gap-1 rounded bg-bg-secondary px-1 py-0.5 shadow-lg group-hover:flex ${
            isSelf ? '' : 'left-0 right-auto'
          }`}
        >
          <button
            onClick={handleReply}
            className="rounded p-1 text-text-muted hover:text-accent"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {isSelf && (
            <>
              <button
                onClick={() => {
                  setIsEditing(true)
                  setEditContent(message.content)
                }}
                className="rounded p-1 text-text-muted hover:text-accent"
                title="Edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="rounded p-1 text-text-muted hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={handlePin}
            className={`rounded p-1 ${
              message.isPinned ? 'text-accent' : 'text-text-muted hover:text-accent'
            }`}
            title={message.isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        </div>

        {showPicker && (
          <div
            className={`absolute z-10 ${
              isSelf ? 'right-0 -top-12' : 'left-0 -top-12'
            }`}
          >
            <ReactionPicker onSelect={handleReaction} />
          </div>
        )}
      </div>
    </div>
  )
}
