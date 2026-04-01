import { useState, useCallback, useEffect } from 'react'
import { Brain, Search, Plus, X, Tag } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import { useRoomStore } from '@/stores/room-store'
import { toast } from 'react-hot-toast'
import type { MemoryEntry } from '@/types'

interface MemoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const { activeRoom } = useRoomStore()
  const { memories, fetchMemories, createMemory, isLoading } = useAIStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [newSummary, setNewSummary] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isOpen && activeRoom) {
      fetchMemories(undefined, activeRoom.id)
    }
  }, [isOpen, activeRoom, fetchMemories])

  const filteredMemories = memories.filter((m: MemoryEntry) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      m.summary.toLowerCase().includes(q) ||
      m.keywords.some((k: string) => k.toLowerCase().includes(q))
    )
  })

  const handleCreateMemory = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newSummary.trim() || !activeRoom) return

      setIsCreating(true)
      try {
        const keywords = newKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
        await createMemory({
          summary: newSummary.trim(),
          content: newContent.trim(),
          keywords,
          roomId: activeRoom.id,
        })
        toast.success('Memory created')
        setNewSummary('')
        setNewContent('')
        setNewKeywords('')
        setShowCreateForm(false)
      } catch {
        toast.error('Failed to create memory')
      } finally {
        setIsCreating(false)
      }
    },
    [newSummary, newContent, newKeywords, activeRoom, createMemory]
  )

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-success'
    if (score >= 0.5) return 'text-warning'
    return 'text-text-muted'
  }

  const getSourceBadge = (source: MemoryEntry['source']) => {
    const colors: Record<string, string> = {
      CHAT: 'badge-accent',
      ROOM: 'badge-success',
      USER_PROFILE: 'badge-warning',
      SYSTEM: 'badge-danger',
    }
    return colors[source] || 'badge-accent'
  }

  if (!isOpen) return null

  return (
    <div className="w-80 border-l border-bg-elevated bg-bg-primary flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent-light">
            <Brain size={18} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Memories</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            title="Create memory"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-bg-elevated">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
          />
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateMemory} className="px-3 py-3 border-b border-bg-elevated space-y-2">
          <input
            type="text"
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Summary *"
            className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
            required
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Content details..."
            rows={2}
            className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent resize-none"
          />
          <input
            type="text"
            value={newKeywords}
            onChange={(e) => setNewKeywords(e.target.value)}
            placeholder="Keywords (comma-separated)"
            className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isCreating || !newSummary.trim()}
              className="flex-1 btn-primary text-xs py-1.5"
            >
              {isCreating ? 'Creating...' : 'Save Memory'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-ghost text-xs py-1.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filteredMemories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="h-10 w-10 text-text-muted opacity-30 mb-2" />
            <p className="text-xs text-text-muted">
              {searchQuery ? 'No memories match your search' : 'No memories yet'}
            </p>
          </div>
        )}

        {filteredMemories.map((memory: MemoryEntry) => (
          <div
            key={memory.id}
            className="p-3 rounded-lg bg-bg-secondary border border-bg-elevated hover:border-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-xs font-medium text-text-primary line-clamp-2 flex-1">
                {memory.summary}
              </p>
              <span className={`text-[10px] font-semibold shrink-0 ${getScoreColor(memory.score)}`}>
                {Math.round(memory.score * 100)}%
              </span>
            </div>

            {memory.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {memory.keywords.slice(0, 4).map((keyword: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-bg-elevated text-[10px] text-text-secondary"
                  >
                    <Tag size={8} />
                    {keyword}
                  </span>
                ))}
                {memory.keywords.length > 4 && (
                  <span className="text-[10px] text-text-muted">+{memory.keywords.length - 4}</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className={`badge text-[10px] ${getSourceBadge(memory.source)}`}>
                {memory.source}
              </span>
              <span className="text-[10px] text-text-muted">
                {new Date(memory.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
