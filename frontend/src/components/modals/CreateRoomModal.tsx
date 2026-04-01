import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Hash, Globe, Lock, Users } from 'lucide-react'
import { useRoomStore } from '@/stores/room-store'
import { toast } from 'react-hot-toast'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom } = useRoomStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'PRIVATE' | 'INTERNAL' | 'PUBLIC'>('PRIVATE')
  const [tagsInput, setTagsInput] = useState('')
  const [maxMembers, setMaxMembers] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setVisibility('PRIVATE')
      setTagsInput('')
      setMaxMembers('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        toast.error('Room name is required')
        return
      }

      setIsSubmitting(true)
      try {
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        await createRoom({
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags,
          maxMembers: maxMembers !== '' ? Number(maxMembers) : undefined,
        })
        toast.success(`Room "${name.trim()}" created!`)
        onClose()
      } catch {
        toast.error('Failed to create room')
      } finally {
        setIsSubmitting(false)
      }
    },
    [name, description, visibility, tagsInput, maxMembers, createRoom, onClose]
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose()
      }
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

  const visibilityOptions: { value: 'PRIVATE' | 'INTERNAL' | 'PUBLIC'; label: string; icon: typeof Lock }[] = [
    { value: 'PRIVATE', label: 'Private', icon: Lock },
    { value: 'INTERNAL', label: 'Internal', icon: Users },
    { value: 'PUBLIC', label: 'Public', icon: Globe },
  ]

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in"
    >
      <div className="w-full max-w-lg mx-4 bg-bg-secondary border border-bg-elevated rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-elevated">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent-light">
              <Hash size={18} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Create Room</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="room-name" className="block text-sm font-medium text-text-secondary mb-1.5">
              Room Name <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                ref={nameInputRef}
                id="room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Alpha"
                className="input-field pl-9"
                maxLength={100}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="room-desc" className="block text-sm font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              rows={3}
              className="input-field resize-none"
              maxLength={500}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {visibilityOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVisibility(value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    visibility === value
                      ? 'border-accent bg-accent/10 text-accent-light'
                      : 'border-bg-elevated bg-bg-tertiary text-text-secondary hover:border-bg-hover'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="room-tags" className="block text-sm font-medium text-text-secondary mb-1.5">
              Tags
            </label>
            <input
              id="room-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. dev, frontend, urgent"
              className="input-field"
            />
            <p className="mt-1 text-xs text-text-muted">Comma-separated</p>
          </div>

          {/* Max Members */}
          <div>
            <label htmlFor="room-max-members" className="block text-sm font-medium text-text-secondary mb-1.5">
              Max Members <span className="text-text-muted">(optional)</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                id="room-max-members"
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="No limit"
                min={2}
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
