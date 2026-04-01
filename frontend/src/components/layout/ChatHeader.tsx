import { useState } from 'react'
import { Search, Bot, Users, Settings, PanelLeftClose, PanelLeftOpen, Hash } from 'lucide-react'
import { useRoomStore } from '@/stores/room-store'
import { cn, getInitials, PRESENCE_COLORS } from '@/lib/utils'
import type { User } from '@/types'

interface ChatHeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onSearch: () => void
  onToggleAiPanel: () => void
  onMembers: () => void
  onSettings: () => void
}

export default function ChatHeader({
  onToggleSidebar,
  sidebarOpen,
  onSearch,
  onToggleAiPanel,
  onMembers,
  onSettings,
}: ChatHeaderProps) {
  const { activeRoom, onlineUsers } = useRoomStore()
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false)

  if (!activeRoom) {
    return (
      <header className="flex items-center justify-between h-14 px-4 border-b border-bg-elevated bg-bg-secondary/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          <h2 className="text-sm font-medium text-text-muted">Select a room to start chatting</h2>
        </div>
      </header>
    )
  }

  const memberCount = activeRoom.members?.length || 0
  const onlineCount = onlineUsers.length

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-bg-elevated bg-bg-secondary/80 backdrop-blur-xl flex-shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-accent/10 text-accent-light flex-shrink-0">
            <Hash size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate">{activeRoom.name}</h2>
            {activeRoom.description && (
              <p className="text-xs text-text-muted truncate max-w-xs">{activeRoom.description}</p>
            )}
          </div>
        </div>

        {/* Member count */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-1 bg-bg-elevated rounded-full">
          <Users size={12} className="text-text-muted" />
          <span className="text-xs text-text-secondary">{memberCount}</span>
          {onlineCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs text-success">{onlineCount}</span>
            </>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Online users avatars */}
        {onlineUsers.length > 0 && (
          <div className="relative hidden md:block mr-2">
            <button
              onClick={() => setShowOnlineDropdown(!showOnlineDropdown)}
              className="flex items-center -space-x-2"
            >
              {onlineUsers.slice(0, 3).map((u: User) => (
                <div
                  key={u.id}
                  className="relative w-7 h-7 rounded-full bg-bg-elevated border-2 border-bg-secondary flex items-center justify-center text-[10px] font-medium text-text-secondary"
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(u.displayName || u.username)
                  )}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-secondary"
                    style={{ backgroundColor: PRESENCE_COLORS[u.presenceStatus] }}
                  />
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-bg-elevated border-2 border-bg-secondary flex items-center justify-center text-[10px] font-medium text-text-secondary">
                  +{onlineUsers.length - 3}
                </div>
              )}
            </button>

            {/* Online users dropdown */}
            {showOnlineDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOnlineDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-bg-tertiary border border-bg-elevated rounded-xl shadow-xl z-20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-bg-elevated">
                    <p className="text-xs font-medium text-text-secondary">Online — {onlineUsers.length}</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {onlineUsers.map((u: User) => (
                      <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg-elevated transition-colors">
                        <div className="relative flex-shrink-0">
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent-light">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getInitials(u.displayName || u.username)
                            )}
                          </div>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-tertiary"
                            style={{ backgroundColor: PRESENCE_COLORS[u.presenceStatus] }}
                          />
                        </div>
                        <span className="text-sm text-text-primary truncate">{u.displayName || u.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <button
          onClick={onSearch}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          aria-label="Search messages"
        >
          <Search size={18} />
        </button>
        <button
          onClick={onToggleAiPanel}
          className="p-2 text-text-secondary hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors"
          aria-label="Toggle AI panel"
        >
          <Bot size={18} />
        </button>
        <button
          onClick={onMembers}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          aria-label="Members"
        >
          <Users size={18} />
        </button>
        <button
          onClick={onSettings}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          aria-label="Room settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
