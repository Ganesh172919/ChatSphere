import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { AIPanel } from '@/components/chat/AIPanel'
import { MembersPanel } from '@/components/chat/MembersPanel'
import { CreateRoomModal } from '@/components/modals/CreateRoomModal'
import { SearchModal } from '@/components/modals/SearchModal'
import ChatLayout from '@/components/layout/ChatLayout'
import { useSocket } from '@/hooks/use-socket'
import { useRoomStore } from '@/stores/room-store'
import { useAuthStore } from '@/stores/auth-store'

export default function ChatPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { activeRoom, fetchRooms } = useRoomStore()

  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [membersPanelOpen, setMembersPanelOpen] = useState(false)
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useSocket(activeRoom?.id)

  const handleToggleAiPanel = useCallback(() => {
    setAiPanelOpen((prev) => !prev)
    if (membersPanelOpen) setMembersPanelOpen(false)
    if (settingsPanelOpen) setSettingsPanelOpen(false)
  }, [membersPanelOpen, settingsPanelOpen])

  const handleToggleMembers = useCallback(() => {
    setMembersPanelOpen((prev) => !prev)
    if (aiPanelOpen) setAiPanelOpen(false)
    if (settingsPanelOpen) setSettingsPanelOpen(false)
  }, [aiPanelOpen, settingsPanelOpen])

  const handleToggleSettings = useCallback(() => {
    navigate('/settings')
  }, [navigate])

  const handleCreateRoom = useCallback(() => {
    setCreateRoomOpen(true)
  }, [])

  const handleSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  return (
    <>
      <ChatLayout
        onCreateRoom={handleCreateRoom}
        onSearch={handleSearch}
        onToggleAiPanel={handleToggleAiPanel}
        onMembers={handleToggleMembers}
        onSettings={handleToggleSettings}
        aiPanelOpen={aiPanelOpen}
        membersPanelOpen={membersPanelOpen}
        settingsPanelOpen={settingsPanelOpen}
        aiPanel={<AIPanel isOpen={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />}
        membersPanel={<MembersPanel isOpen={membersPanelOpen} onClose={() => setMembersPanelOpen(false)} />}
      >
        <MessageList />
        <MessageInput />
      </ChatLayout>

      <CreateRoomModal isOpen={createRoomOpen} onClose={() => setCreateRoomOpen(false)} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
