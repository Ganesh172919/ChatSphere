import { useState, useCallback } from 'react'
import { Users, UserPlus, Shield, Crown } from 'lucide-react'
import { useRoomStore } from '@/stores/room-store'
import { useAuthStore } from '@/stores/auth-store'
import { getInitials, PRESENCE_COLORS } from '@/lib/utils'
import type { RoomMember, User } from '@/types'
import { toast } from 'react-hot-toast'
import { socketClient } from '@/lib/socket-client'

interface MembersPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MembersPanel({ isOpen, onClose }: MembersPanelProps) {
  const { activeRoom, joinRoom } = useRoomStore()
  const { user } = useAuthStore()
  const [addInput, setAddInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const members = activeRoom?.members || []

  const handleAddMember = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!addInput.trim() || !activeRoom) return

      setIsAdding(true)
      try {
        socketClient.joinRoom(activeRoom.id)
        toast.success(`Added "${addInput.trim()}" to the room`)
        setAddInput('')
      } catch {
        toast.error('Failed to add member')
      } finally {
        setIsAdding(false)
      }
    },
    [addInput, activeRoom]
  )

  const getRoleIcon = (role: RoomMember['role']) => {
    switch (role) {
      case 'OWNER':
        return <Crown size={12} className="text-warning" />
      case 'ADMIN':
        return <Shield size={12} className="text-accent" />
      default:
        return null
    }
  }

  const getRoleBadgeClass = (role: RoomMember['role']) => {
    switch (role) {
      case 'OWNER':
        return 'bg-warning/20 text-warning'
      case 'ADMIN':
        return 'bg-accent/20 text-accent-light'
      default:
        return 'bg-bg-elevated text-text-muted'
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-72 border-l border-bg-elevated bg-bg-primary flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent-light">
            <Users size={18} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Members</h3>
          <span className="text-xs text-text-muted">({members.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Add Member */}
      <div className="px-3 py-2 border-b border-bg-elevated">
        <form onSubmit={handleAddMember} className="flex items-center gap-2">
          <div className="relative flex-1">
            <UserPlus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="Add by email or username"
              className="w-full bg-bg-tertiary rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !addInput.trim()}
            className="p-2 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <UserPlus size={14} />
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-text-muted opacity-30 mb-2" />
            <p className="text-xs text-text-muted">No members yet</p>
          </div>
        )}

        {members
          .sort((a: RoomMember, b: RoomMember) => {
            const order = { OWNER: 0, ADMIN: 1, MEMBER: 2 }
            return order[a.role] - order[b.role]
          })
          .map((member: RoomMember) => {
            const memberUser = member.user as User
            const isOnline = memberUser.presenceStatus === 'ONLINE'
            const isCurrentUser = user?.id === memberUser.id

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-bg-elevated transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent-light">
                    {memberUser.avatarUrl ? (
                      <img
                        src={memberUser.avatarUrl}
                        alt={memberUser.displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(memberUser.displayName || memberUser.username)
                    )}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-primary"
                    style={{ backgroundColor: PRESENCE_COLORS[memberUser.presenceStatus] }}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {memberUser.displayName || memberUser.username}
                      {isCurrentUser && (
                        <span className="text-[10px] text-text-muted ml-1">(you)</span>
                      )}
                    </p>
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`badge text-[10px] ${getRoleBadgeClass(member.role)}`}>
                      {member.role}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {isOnline ? 'Online' : memberUser.presenceStatus.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
