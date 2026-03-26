import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Send, Menu, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import SmartReplies from '../components/SmartReplies';
import GrammarSuggestion from '../components/GrammarSuggestion';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';

export default function SoloChat() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, startNewChat } = useChat();
  const { activeConversationId, conversations } = useChatStore();

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages.length, isLoading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        startNewChat();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startNewChat]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-navy-900">
      <Navbar />

      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={startNewChat}
        />

        {/* Main chat area */}
        <main
          className={`flex-1 flex flex-col transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-72' : ''
          }`}
        >
          {/* Toggle sidebar button (mobile) */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-800/50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all"
            >
              <Menu size={18} />
            </button>
            {activeConversation && (
              <h2 className="text-sm font-medium text-gray-300 truncate">
                {activeConversation.title}
              </h2>
            )}
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700/50">
              <Sparkles size={12} className="text-neon-purple" />
              <span className="text-[10px] text-gray-500 font-medium">gemini-2.5-pro</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center mb-6 animate-pulse-glow">
                  <span className="text-xl font-bold text-white">GX</span>
                </div>
                <h2 className="font-display font-bold text-2xl text-white mb-2">
                  Ask me something worth thinking about.
                </h2>
                <p className="text-gray-500 text-sm max-w-md">
                  I&apos;m a reasoning engine, not a simple chatbot. I&apos;ll break down problems, challenge assumptions, and give you structured insights.
                </p>
                <div className="flex items-center gap-2 mt-6 text-xs text-gray-600">
                  <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">Ctrl+K</kbd>
                  <span>New chat</span>
                  <span className="text-navy-600">|</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-navy-700 text-gray-500 text-[10px] font-mono border border-navy-600">Shift+Enter</kbd>
                  <span>New line</span>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-1">
                {activeConversation.messages.map((msg, i) => (
                  <MessageBubble
                    key={`${activeConversation.id}-${i}`}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    index={i}
                  />
                ))}
                <AnimatePresence>
                  {isLoading && <TypingIndicator />}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Smart Replies */}
          {activeConversation && activeConversation.messages.length > 0 && (
            <SmartReplies
              messages={activeConversation.messages.map(m => ({
                role: m.role,
                content: m.content,
              }))}
              context="Solo AI chat"
              onSelect={(reply) => setInput(reply)}
            />
          )}

          {/* Input area */}
          <div className="border-t border-navy-800/50 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <GrammarSuggestion
                text={input}
                onAccept={(corrected) => setInput(corrected)}
                enabled={true}
              />
              <div className="flex items-end gap-3 bg-navy-800 rounded-2xl border border-navy-700/50 p-3 focus-within:border-neon-purple/30 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something worth thinking about..."
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none text-sm focus:outline-none max-h-40"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-600">{input.length}</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
