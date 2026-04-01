import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, MessageSquare } from 'lucide-react'
import { useRoomStore } from '@/stores/room-store'
import type { Message } from '@/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { activeRoom, searchMessages } = useRoomStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setIsSearching(false)
    }
  }, [isOpen])

  const handleSearch = useCallback(async () => {
    if (!activeRoom || !query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const found = await searchMessages(activeRoom.id, query.trim())
      setResults(found)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [activeRoom, query, searchMessages])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch()
      } else {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  const handleResultClick = useCallback(
    (messageId: string) => {
      const el = document.getElementById(`message-${messageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-accent')
        setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2000)
      }
      onClose()
    },
    [onClose]
  )

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-in"
    >
      <div className="w-full max-w-xl mx-4 bg-bg-secondary border border-bg-elevated rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-elevated">
          <Search className="h-5 w-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
          />
          {isSearching && (
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-text-muted">Type to search messages in this room</p>
            </div>
          )}

          {query.trim() && results.length === 0 && !isSearching && (
            <div className="px-6 py-12 text-center">
              <Search className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-text-muted">No messages found</p>
            </div>
          )}

          {results.map((msg) => (
            <button
              key={msg.id}
              id={`message-${msg.id}`}
              onClick={() => handleResultClick(msg.id)}
              className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition-colors border-b border-bg-elevated/50 last:border-b-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-accent">{msg.authorName}</span>
                <span className="text-[10px] text-text-muted">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-text-primary line-clamp-2">{msg.content}</p>
              {activeRoom && (
                <div className="flex items-center gap-1 mt-1">
                  <MessageSquare size={10} className="text-text-muted" />
                  <span className="text-[10px] text-text-muted">{activeRoom.name}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
