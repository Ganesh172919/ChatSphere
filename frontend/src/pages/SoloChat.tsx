import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Brain, Send, Menu, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import SmartReplies from '../components/SmartReplies';
import GrammarSuggestion from '../components/GrammarSuggestion';
import ConversationInsightsPanel from '../components/ConversationInsightsPanel';
import { runConversationAction } from '../api/conversations';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';

export default function SoloChat() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, removeConversation, startNewChat } = useChat();
  const { activeConversationId, conversations, updateConversationInsight } = useChatStore();

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages.length, isLoading, scrollToBottom]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        startNewChat();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startNewChat]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleInsightAction = async (action: 'summarize' | 'extract-tasks' | 'extract-decisions') => {
    if (!activeConversation?.serverId || insightLoading) {
      return;
    }

    setInsightLoading(true);
    try {
      const result = await runConversationAction(activeConversation.serverId, action);
      updateConversationInsight(activeConversation.id, result.insight);
    } catch (error) {
      console.error('Failed to refresh conversation insight', error);
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="h-screen bg-navy-900">
      <Navbar />

      <div className="flex h-full pt-16 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={startNewChat}
          onDeleteConversation={(conversationId) => void removeConversation(conversationId)}
        />

        <main className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : ''}`}>
          <div className="flex items-center gap-3 border-b border-navy-800/50 px-4 py-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-gray-400 transition-all hover:bg-navy-800 hover:text-white"
              type="button"
            >
              <Menu size={18} />
            </button>

            {activeConversation ? (
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium text-gray-300">{activeConversation.title}</h2>
                {activeConversation.sourceType && activeConversation.sourceType !== 'native' ? (
                  <p className="text-[10px] text-gray-600">
                    Imported from {activeConversation.sourceLabel || activeConversation.sourceType}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-navy-700/50 bg-navy-800 px-2.5 py-1">
              <Sparkles size={12} className="text-neon-purple" />
              <span className="text-[10px] font-medium text-gray-500">gemini-2.0-flash</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-2 py-4">
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue">
                      <Brain className="text-white" size={24} />
                    </div>
                    <h2 className="mb-2 font-display text-2xl font-bold text-white">
                      Ask me something worth thinking about.
                    </h2>
                    <p className="max-w-md text-sm text-gray-500">
                      ChatSphere now keeps synced conversations, insight summaries, and memory-aware replies so your solo chat can build on real context.
                    </p>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-1">
                    {activeConversation.messages.map((message, index) => (
                      <MessageBubble
                        key={`${activeConversation.id}-${index}-${message.timestamp}`}
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                        index={index}
                        memoryRefs={message.memoryRefs}
                      />
                    ))}
                    <AnimatePresence>{isLoading ? <TypingIndicator /> : null}</AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {activeConversation && activeConversation.messages.length > 0 ? (
                <SmartReplies
                  messages={activeConversation.messages.map((message) => ({
                    role: message.role,
                    content: message.content,
                  }))}
                  context="Solo AI chat"
                  onSelect={(reply) => setInput(reply)}
                />
              ) : null}

              <div className="border-t border-navy-800/50 px-4 py-3">
                <div className="mx-auto max-w-3xl">
                  <GrammarSuggestion
                    text={input}
                    onAccept={(corrected) => setInput(corrected)}
                    enabled
                  />
                  <div className="flex items-end gap-3 rounded-2xl border border-navy-700/50 bg-navy-800 p-3 transition-colors focus-within:border-neon-purple/30">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask something worth thinking about..."
                      rows={1}
                      className="max-h-40 flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-[10px] text-gray-600">{input.length}</span>
                      <button
                        onClick={() => void handleSubmit()}
                        disabled={!input.trim() || isLoading}
                        className="rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue p-2.5 text-white transition-all hover:shadow-lg hover:shadow-purple-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                        type="button"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="hidden w-80 flex-shrink-0 border-l border-navy-800/50 p-4 xl:block">
              <ConversationInsightsPanel
                heading="Conversation Insight"
                insight={activeConversation?.insight}
                loading={insightLoading}
                onAction={handleInsightAction}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
