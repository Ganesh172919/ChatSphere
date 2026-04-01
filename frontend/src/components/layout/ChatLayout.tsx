import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import ChatHeader from './ChatHeader'
import { cn } from '@/lib/utils'

interface ChatLayoutProps {
  children: ReactNode
  onCreateRoom: () => void
  onSearch: () => void
  onToggleAiPanel: () => void
  onMembers: () => void
  onSettings: () => void
  aiPanelOpen?: boolean
  membersPanelOpen?: boolean
  settingsPanelOpen?: boolean
  aiPanel?: ReactNode
  membersPanel?: ReactNode
  settingsPanel?: ReactNode
}

export default function ChatLayout({
  children,
  onCreateRoom,
  onSearch,
  onToggleAiPanel,
  onMembers,
  onSettings,
  aiPanelOpen = false,
  membersPanelOpen = false,
  settingsPanelOpen = false,
  aiPanel,
  membersPanel,
  settingsPanel,
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  return (
    <div className="flex h-screen w-full bg-bg-primary overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onCreateRoom={onCreateRoom}
        onSettings={onSettings}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
          onSearch={onSearch}
          onToggleAiPanel={onToggleAiPanel}
          onMembers={onMembers}
          onSettings={onSettings}
        />

        {/* Content + right panels */}
        <div className="flex flex-1 min-h-0">
          {/* Main chat area */}
          <main
            className={cn(
              'flex-1 flex flex-col min-w-0 transition-all duration-300',
              sidebarOpen ? '' : ''
            )}
          >
            {children}
          </main>

          {/* AI Panel */}
          {aiPanelOpen && aiPanel && (
            <aside className="w-80 flex-shrink-0 bg-bg-secondary border-l border-bg-elevated flex flex-col animate-slide-right">
              {aiPanel}
            </aside>
          )}

          {/* Members Panel */}
          {membersPanelOpen && membersPanel && (
            <aside className="w-72 flex-shrink-0 bg-bg-secondary border-l border-bg-elevated flex flex-col animate-slide-right">
              {membersPanel}
            </aside>
          )}

          {/* Settings Panel */}
          {settingsPanelOpen && settingsPanel && (
            <aside className="w-80 flex-shrink-0 bg-bg-secondary border-l border-bg-elevated flex flex-col animate-slide-right">
              {settingsPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
