import { useState, useCallback, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Lightbulb, MessageSquare, X } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import { useRoomStore } from '@/stores/room-store'
import { toast } from 'react-hot-toast'

type AITab = 'chat' | 'replies' | 'insights'

interface AIMessage {
  role: 'user' | 'ai'
  content: string
}

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const { activeRoom } = useRoomStore()
  const { chatWithAI, getSmartReplies, generateInsights, isThinking } = useAIStore()
  const [activeTab, setActiveTab] = useState<AITab>('chat')

  // Chat tab state
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<AIMessage[]>([])

  // Smart replies state
  const [replyInput, setReplyInput] = useState('')
  const [smartReplies, setSmartReplies] = useState<string[]>([])

  // Insights state
  const [insightsInput, setInsightsInput] = useState('')
  const [insightsResult, setInsightsResult] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isThinking])

  useEffect(() => {
    if (isOpen && activeTab === 'chat' && chatInputRef.current) {
      chatInputRef.current.focus()
    }
  }, [isOpen, activeTab])

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!chatInput.trim() || !activeRoom) return

      const userMsg = chatInput.trim()
      setChatInput('')
      setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }])

      try {
        const context = activeRoom.messages?.slice(-10).map((m: { content: string }) => m.content).join('\n')
        const response = await chatWithAI(userMsg, context, activeRoom.id)
        setChatHistory((prev) => [...prev, { role: 'ai', content: response.content }])
      } catch {
        toast.error('AI chat failed')
        setChatHistory((prev) => [
          ...prev,
          { role: 'ai', content: 'Sorry, I could not process that request.' },
        ])
      }
    },
    [chatInput, activeRoom, chatWithAI]
  )

  const handleSmartReplies = useCallback(async () => {
    if (!replyInput.trim() || !activeRoom) return

    try {
      const replies = await getSmartReplies(replyInput.trim(), activeRoom.id)
      setSmartReplies(replies)
    } catch {
      toast.error('Failed to get smart replies')
      setSmartReplies([])
    }
  }, [replyInput, activeRoom, getSmartReplies])

  const handleInsights = useCallback(async () => {
    if (!insightsInput.trim() || !activeRoom) return

    try {
      const result = await generateInsights(insightsInput.trim(), activeRoom.id)
      setInsightsResult(result)
    } catch {
      toast.error('Failed to generate insights')
      setInsightsResult('')
    }
  }, [insightsInput, activeRoom, generateInsights])

  const handleReplyClick = useCallback((reply: string) => {
    setReplyInput(reply)
  }, [])

  if (!isOpen) return null

  const tabs: { key: AITab; label: string; icon: typeof Bot }[] = [
    { key: 'chat', label: 'Chat', icon: MessageSquare },
    { key: 'replies', label: 'Smart Replies', icon: Lightbulb },
    { key: 'insights', label: 'Insights', icon: Lightbulb },
  ]

  return (
    <div className="w-80 border-l border-bg-elevated bg-bg-primary flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10 text-accent-light">
            <Bot size={18} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">AI Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-bg-elevated">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? 'text-accent-light border-b-2 border-accent bg-accent/5'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-12 w-12 text-text-muted opacity-30 mb-3" />
                  <p className="text-sm text-text-muted">Ask me anything about this conversation</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-bg-tertiary rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 size={14} className="text-accent animate-spin" />
                    <span className="text-xs text-text-muted">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="px-3 py-3 border-t border-bg-elevated">
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask AI..."
                  className="flex-1 bg-bg-tertiary rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  disabled={isThinking || !chatInput.trim()}
                  className="p-2 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </>
        )}

        {/* Smart Replies Tab */}
        {activeTab === 'replies' && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Enter a message to get replies..."
                  className="flex-1 bg-bg-tertiary rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent"
                />
                <button
                  onClick={handleSmartReplies}
                  disabled={!replyInput.trim()}
                  className="p-2 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>

              {smartReplies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-secondary">Suggested Replies</p>
                  {smartReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleReplyClick(reply)}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-primary hover:bg-bg-elevated transition-colors border border-bg-elevated"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            <div className="space-y-3">
              <textarea
                value={insightsInput}
                onChange={(e) => setInsightsInput(e.target.value)}
                placeholder="Paste text or describe what you want insights about..."
                rows={4}
                className="w-full bg-bg-tertiary rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none ring-1 ring-transparent focus:ring-accent resize-none"
              />
              <button
                onClick={handleInsights}
                disabled={!insightsInput.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Lightbulb size={16} />
                Generate Insights
              </button>

              {insightsResult && (
                <div className="p-3 rounded-lg bg-bg-tertiary border border-bg-elevated">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={14} className="text-accent" />
                    <p className="text-xs font-medium text-accent-light">Insights</p>
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{insightsResult}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
