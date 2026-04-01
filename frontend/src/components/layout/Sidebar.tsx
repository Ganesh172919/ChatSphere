import { useState } from 'react'
import { Plus, Settings, Hash, MessageSquare, LogOut, Menu, X } from 'lucide-react'
import { useRoomStore } from '@/stores/room-store'
import { useAuthStore } from '@/stores/auth-store'
import { cn, getInitials } from '@/lib/utils'
import type { Room } from '@/types'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
  onCreateRoom: () => void
  onSettings: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose, onCreateRoom, onSettings }: SidebarProps) {
  const { rooms, activeRoom, setActiveRoom } = useRoomStore()
  const { user, logout } = useAuthStore()
  const [showAll, setShowAll] = useState(false)

  const displayedRooms = showAll ? rooms : rooms.slice(0, 10)

  const handleRoomClick = (room: Room) => {
    setActiveRoom(room)
    onMobileClose()
  }

  const handleLogout = () => {
    logout()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-elevated">
        <div className="avatar avatar-sm flex-shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials(user?.displayName || user?.username || '?')
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{user?.displayName || user?.username}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-text-secondary">Online</span>
          </div>
        </div>
        <button
          onClick={onSettings}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* New Room Button */}
      <div className="px-3 pt-3">
        <button
          onClick={onCreateRoom}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent/10 hover:bg-accent/20 text-accent-light font-medium rounded-lg transition-all duration-200 text-sm"
        >
          <Plus size={16} />
          New Room
        </button>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {displayedRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare size={32} className="text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">No rooms yet</p>
            <p className="text-xs text-text-muted mt-1">Create one to get started</p>
          </div>
        ) : (
          displayedRooms.map((room: Room) => {
            const isActive = activeRoom?.id === room.id
            const unread = room.unreadCount || 0

            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group',
                  isActive
                    ? 'bg-accent/10 border-l-2 border-accent'
                    : 'hover:bg-bg-elevated border-l-2 border-transparent'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-md flex-shrink-0 mt-0.5',
                  isActive ? 'bg-accent/20 text-accent-light' : 'bg-bg-elevated text-text-muted group-hover:text-text-secondary'
                )}>
                  <Hash size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-accent-light' : 'text-text-primary'
                    )}>
                      {room.name}
                    </span>
                    {unread > 0 && (
                      <span className="flex-shrink-0 ml-2 w-5 h-5 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {room.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Show More / Less */}
      {rooms.length > 10 && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs text-text-muted hover:text-text-secondary py-1.5 transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${rooms.length} rooms`}
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 py-3 border-t border-bg-elevated">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-bg-secondary border-r border-bg-elevated transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0 bg-bg-secondary border-r border-bg-elevated h-full">
        {sidebarContent}
      </aside>
    </>
  )
}
