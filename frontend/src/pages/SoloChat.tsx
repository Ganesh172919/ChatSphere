import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Brain, Send, Menu, Sparkles, Paperclip, X, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import SmartReplies from '../components/SmartReplies';
import GrammarSuggestion from '../components/GrammarSuggestion';
import ConversationInsightsPanel from '../components/ConversationInsightsPanel';
import { runConversationAction } from '../api/conversations';
import { fetchAvailableModels, type AIModel } from '../api/ai';
import { uploadFile } from '../api/rooms';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import toast from 'react-hot-toast';

const SOLO_MODEL_STORAGE_KEY = 'chatsphere.solo.model';

export default function SoloChat() {
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [emptyModelMessage, setEmptyModelMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isLoading, removeConversation, startNewChat } = useChat();
  const { activeConversationId, conversations, updateConversationInsight } = useChatStore();

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const activeModel = availableModels.find((model) => model.id === selectedModelId) || availableModels[0] || null;

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
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await fetchAvailableModels();
        setAvailableModels(result.models);
        setEmptyModelMessage(result.emptyStateMessage || '');

        const stored = localStorage.getItem(SOLO_MODEL_STORAGE_KEY);
        const nextModelId = result.models.some((model) => model.id === stored)
          ? String(stored)
          : result.defaultModelId || result.models[0]?.id || '';
        setSelectedModelId(nextModelId);
      } catch (error) {
        console.error('Failed to load AI models', error);
        setAvailableModels([]);
        setSelectedModelId('');
        setEmptyModelMessage('No AI models are configured. Add provider API keys in backend/.env.');
      } finally {
        setLoadingModels(false);
      }
    };

    void loadModels();
  }, []);

  useEffect(() => {
    if (!selectedModelId) {
      return;
    }

    localStorage.setItem(SOLO_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

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

  const clearComposer = () => {
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) {
      return;
    }

    if (!loadingModels && availableModels.length === 0) {
      toast.error(emptyModelMessage || 'No AI models are configured. Add provider API keys in backend/.env.');
      return;
    }

    const message = input.trim() || (selectedFile ? `Please analyze the attached file: ${selectedFile.name}` : '');
    try {
      let attachment = null;

      if (selectedFile) {
        attachment = await uploadFile(selectedFile);
      }

      await sendMessage(message, {
        modelId: selectedModelId || activeModel?.id,
        attachment,
      });

      clearComposer();
    } catch (error) {
      console.error('Failed to send solo message', error);
      toast.error('Failed to send message');
    }
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

            <div className="ml-auto flex items-center gap-2 rounded-lg border border-navy-700/50 bg-navy-800 px-2.5 py-1">
              <Sparkles size={12} className="text-neon-purple" />
              <select
                value={selectedModelId}
                onChange={(event) => setSelectedModelId(event.target.value)}
                disabled={loadingModels || availableModels.length === 0}
                className="bg-transparent text-[10px] font-medium text-gray-400 focus:outline-none"
              >
                {availableModels.length === 0 ? (
                  <option value="">No AI models configured</option>
                ) : null}
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id} className="bg-navy-900 text-gray-200">
                    {model.label} ({model.provider})
                  </option>
                ))}
              </select>
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
                      ChatSphere now supports provider-aware AI routing, memory-aware replies, and file-assisted prompts in solo chat.
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
                        fileUrl={message.fileUrl}
                        fileName={message.fileName}
                        fileType={message.fileType}
                        fileSize={message.fileSize}
                        modelId={message.modelId}
                        provider={message.provider}
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

                  {selectedFile && (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-navy-700/50 bg-navy-800/60 px-3 py-2 text-xs text-gray-300">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{selectedFile.name}</p>
                        <p className="text-gray-500">
                          {selectedFile.type || 'Unknown type'} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        aria-label="Remove attachment"
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                    <div className="truncate">
                      {loadingModels
                        ? 'Loading models...'
                        : activeModel
                          ? `Routing through ${activeModel.label} via ${activeModel.provider}`
                          : (emptyModelMessage || 'No AI models are configured.')}
                    </div>
                    <div>{selectedFile ? 'File will be included in the prompt' : 'No file attached'}</div>
                  </div>

                  <div className="flex items-end gap-3 rounded-2xl border border-navy-700/50 bg-navy-800 p-3 transition-colors focus-within:border-neon-purple/30">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/javascript,application/javascript,text/x-typescript,application/x-typescript"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl p-2.5 text-gray-400 transition-all hover:bg-navy-700 hover:text-white"
                      type="button"
                    >
                      <Paperclip size={16} />
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask something worth thinking about, or attach a file for context..."
                      rows={1}
                      className="max-h-40 flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-[10px] text-gray-600">{input.length}</span>
                      <button
                        onClick={() => void handleSubmit()}
                        disabled={(!input.trim() && !selectedFile) || isLoading}
                        className="rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue p-2.5 text-white transition-all hover:shadow-lg hover:shadow-purple-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                        type="button"
                      >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
