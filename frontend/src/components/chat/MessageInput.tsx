import { useState, useRef, useEffect, useCallback } from 'react'
import type { Message } from '@/types'
import { useRoomStore } from '@/stores/room-store'
import { useTyping } from '@/hooks/use-typing'
import { socketClient } from '@/lib/socket-client'
import { Send, Paperclip, Reply, X, Smile } from 'lucide-react'
import { ReactionPicker } from './ReactionPicker'

export function MessageInput() {
  const { activeRoom } = useRoomStore()
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const roomId = activeRoom?.id
  const { handleTyping } = useTyping(roomId)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [content])

  useEffect(() => {
    const unsub = useRoomStore.subscribe((state) => {
      const globalReplyTo = (state as unknown as Record<string, unknown>).replyTo as Message | null | undefined
      if (globalReplyTo !== undefined) {
        setReplyTo(globalReplyTo)
      }
    })
    return unsub
  }, [])

  const handleSend = useCallback(() => {
    if (!activeRoom || !content.trim()) return

    socketClient.sendMessage(
      activeRoom.id,
      content.trim(),
      replyTo?.id,
      undefined
    )

    setContent('')
    setReplyTo(null)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [activeRoom, content, replyTo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
      handleTyping()
    },
    [handleTyping]
  )

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !activeRoom) return

      socketClient.sendMessage(activeRoom.id, '', replyTo?.id, file.name)

      setReplyTo(null)

      e.target.value = ''
    },
    [activeRoom, replyTo]
  )

  const handleEmojiSelect = useCallback((emoji: string) => {
    setContent((prev) => prev + emoji)
    setShowEmoji(false)
  }, [])

  const clearReply = useCallback(() => {
    setReplyTo(null)
  }, [])

  if (!activeRoom) return null

  return (
    <div className="border-t border-bg-elevated bg-bg-primary px-4 py-3">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-t-lg border-l-2 border-accent bg-bg-secondary px-3 py-2">
          <Reply className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-accent">
              Replying to {replyTo.authorName}
            </span>
            <p className="truncate text-xs text-text-muted">
              {replyTo.content}
            </p>
          </div>
          <button
            onClick={clearReply}
            className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={handleFileUpload}
          className="shrink-0 rounded-lg p-2 text-text-muted hover:text-accent hover:bg-bg-secondary"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowEmoji((p) => !p)}
            className="shrink-0 rounded-lg p-2 text-text-muted hover:text-accent hover:bg-bg-secondary"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-10">
              <ReactionPicker onSelect={handleEmojiSelect} />
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="min-h-[40px] max-h-[150px] flex-1 resize-none rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
        />

        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="shrink-0 rounded-lg bg-accent p-2 text-white transition-colors hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
