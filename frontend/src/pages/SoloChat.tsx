import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Loader2,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import SmartReplies from '../components/SmartReplies';
import GrammarSuggestion from '../components/GrammarSuggestion';
import ConversationInsightsPanel from '../components/ConversationInsightsPanel';
import { fetchAvailableModels, type AIModel } from '../api/ai';
import { runConversationAction } from '../api/conversations';
import { uploadFile } from '../api/rooms';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import { getModelGroups, type AIModelGroup } from '../utils/aiModels';
import { useAuthStore } from '../store/authStore';

const SOLO_MODEL_STORAGE_KEY = 'chatsphere.solo.model';
const DEFAULT_COMPOSER_HEIGHT = 228;

const formatDate = (value?: string | null) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

interface ModelSelectorProps {
  selectedModelId: string;
  availableModels: AIModel[];
  groupedModels: AIModelGroup[];
  loadingModels: boolean;
  emptyModelMessage: string;
  onChange: (modelId: string) => void;
  label?: string;
  compact?: boolean;
}

function ModelSelector({
  selectedModelId,
  availableModels,
  groupedModels,
  loadingModels,
  emptyModelMessage,
  onChange,
  label = 'Model',
  compact = false,
}: ModelSelectorProps) {
  const disabled = loadingModels || availableModels.length === 0;

  return (
    <div
      className={`rounded-2xl border border-navy-700/70 bg-navy-800/80 ${
        compact ? 'px-3 py-2' : 'px-3.5 py-3'
      }`}
    >
      <p className="mb-1 text-[9px] uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <select
        value={selectedModelId}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`w-full bg-transparent text-white focus:outline-none ${
          compact ? 'text-xs font-medium' : 'text-sm font-medium'
        }`}
        aria-label={label}
      >
        {availableModels.length === 0 ? (
          <option value="">{emptyModelMessage || 'No AI models configured'}</option>
        ) : null}
        {groupedModels.map((group) => (
          <optgroup key={group.provider} label={group.label}>
            {group.models.map((model) => (
              <option key={model.id} value={model.id} className="bg-navy-900 text-white">
                {model.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export default function SoloChat() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [emptyModelMessage, setEmptyModelMessage] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const activeModel = availableModels.find((model) => model.id === selectedModelId) || availableModels[0] || null;
  const groupedModels = useMemo(() => getModelGroups(availableModels), [availableModels]);
  const { user } = useAuthStore();
  const { sendMessage, isLoading, removeConversation, startNewChat } = useChat();
  const { activeConversationId, conversations, updateConversationInsight } = useChatStore();
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const activeMessages = activeConversation?.messages || [];
  const completedMessages = useMemo(
    () => activeMessages.filter((message) => message.messageState !== 'pending'),
    [activeMessages]
  );
  const smartReplyMessages = useMemo(
    () => completedMessages.map((message) => ({ role: message.role, content: message.content })),
    [completedMessages]
  );
  const smartRepliesEnabled = Boolean(
    activeConversation &&
      smartReplyMessages.length > 0 &&
      smartReplyMessages[smartReplyMessages.length - 1]?.role === 'assistant' &&
      !isLoading
  );

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await fetchAvailableModels();
        const visibleModels = result.models.filter((model) => model.id !== 'auto');
        setAvailableModels(visibleModels);
        setEmptyModelMessage(result.emptyStateMessage || '');
        const stored = localStorage.getItem(SOLO_MODEL_STORAGE_KEY);
        const preferred =
          result.defaultModelId && result.defaultModelId !== 'auto'
            ? result.defaultModelId
            : visibleModels[0]?.id || '';
        setSelectedModelId(visibleModels.some((model) => model.id === stored) ? String(stored) : preferred);
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
    if (selectedModelId) localStorage.setItem(SOLO_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: activeMessages.length > 0 ? 'smooth' : 'auto' });
  }, [activeMessages.length, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '40px';
    el.style.height = `${Math.max(40, Math.min(el.scrollHeight, 160))}px`;
  }, [input]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;

    const updateHeight = () => {
      setComposerHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => {
        window.removeEventListener('resize', updateHeight);
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const submit = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    if (!loadingModels && availableModels.length === 0) {
      toast.error(emptyModelMessage || 'No AI models are configured. Add provider API keys in backend/.env.');
      return;
    }

    try {
      const attachment = selectedFile ? await uploadFile(selectedFile) : null;
      await sendMessage(input.trim() || `Please analyze the attached file: ${selectedFile?.name}`, {
        attachment,
        modelId: selectedModelId || activeModel?.id,
      });
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('Failed to send message');
    }
  };

  const runInsight = async (action: 'summarize' | 'extract-tasks' | 'extract-decisions') => {
    if (!activeConversation?.serverId || insightLoading) return;
    setInsightLoading(true);
    try {
      const result = await runConversationAction(activeConversation.serverId, action, selectedModelId || activeModel?.id);
      updateConversationInsight(activeConversation.id, result.insight);
    } finally {
      setInsightLoading(false);
    }
  };

  const chatStatusLabel = loadingModels
    ? 'Loading models...'
    : activeModel
      ? `Using ${activeModel.label}`
      : emptyModelMessage || 'No AI models configured';

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),#0d0f1a] text-white">
      <Navbar />
      <div className="flex h-full pt-16">
        {sidebarOpen ? (
          <button
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            type="button"
          />
        ) : null}

        <aside
          className={`fixed inset-y-16 left-0 z-50 w-[17rem] border-r border-navy-700/60 bg-navy-900/95 px-3 py-3 backdrop-blur-xl transition-all duration-300 lg:relative lg:z-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ flexShrink: 0 }}
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-neon-purple">AI Chat</p>
                <h2 className="mt-1 font-display text-base font-semibold">Conversations</h2>
              </div>
              <button
                onClick={startNewChat}
                className="rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue p-2"
                type="button"
              >
                <Sparkles size={14} />
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Recent chats</p>
              <button
                onClick={startNewChat}
                className="rounded-lg border border-navy-700/70 px-2 py-1 text-[10px] text-gray-300"
                type="button"
              >
                New chat
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-navy-700/70 px-3 py-5 text-center text-xs text-gray-400">
                  Start a new conversation
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => useChatStore.getState().setActiveConversation(conversation.id)}
                    className={`group w-full rounded-xl border px-3 py-2 text-left ${
                      activeConversationId === conversation.id
                        ? 'border-neon-purple/30 bg-neon-purple/10'
                        : 'border-navy-700/60 bg-navy-800/60'
                    }`}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{conversation.title}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {formatDate(conversation.updatedAt || conversation.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeConversation(conversation.id);
                        }}
                        className="rounded-lg p-1 text-gray-500 opacity-0 group-hover:opacity-100"
                        type="button"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 border-l border-navy-800/50">
          <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
            <header className="flex-shrink-0 border-b border-navy-800/60 bg-navy-900/65 px-3 py-2 backdrop-blur-xl lg:px-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen((value) => !value)}
                  className="rounded-xl border border-navy-700/70 p-1.5 text-gray-300 transition-all hover:border-neon-purple/40 hover:text-white"
                  type="button"
                >
                  {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-sm font-semibold">
                    {activeConversation?.title || 'New conversation'}
                  </h1>
                </div>
                <div className="hidden min-w-[12rem] max-w-[15rem] lg:block">
                  <ModelSelector
                    selectedModelId={selectedModelId}
                    availableModels={availableModels}
                    groupedModels={groupedModels}
                    loadingModels={loadingModels}
                    emptyModelMessage={emptyModelMessage}
                    onChange={setSelectedModelId}
                    label="Quick switch"
                    compact
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-navy-700/70 bg-navy-800/80 px-2.5 py-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-neon-purple to-neon-blue text-[10px] font-bold text-white">
                    {user?.username?.slice(0, 2).toUpperCase() || <User size={12} />}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium leading-tight text-white">
                      {user?.displayName || user?.username || 'User'}
                    </p>
                    <p className="text-[9px] leading-tight text-gray-500">Online</p>
                  </div>
                </div>
                <button
                  onClick={() => setRightSidebarOpen((value) => !value)}
                  className="rounded-xl border border-navy-700/70 p-1.5 text-gray-300 transition-all hover:border-neon-purple/40 hover:text-white"
                  type="button"
                >
                  {rightSidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                </button>
              </div>
            </header>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6"
              style={{ paddingBottom: composerHeight + 28 }}
            >
              {!activeConversation || activeMessages.length === 0 ? (
                <div className="mx-auto max-w-4xl py-8">
                  <div className="rounded-2xl border border-navy-700/60 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_45%),rgba(18,20,31,0.85)] p-8">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue">
                      <Brain className="text-white" size={24} />
                    </div>
                    <h2 className="font-display text-2xl font-semibold">Ask anything</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                      Start a conversation with AI. The composer stays docked at the bottom, and you can switch the
                      model there before sending or while continuing a chat.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-xs text-neon-purple">
                        Bottom-docked composer
                      </span>
                      <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-3 py-1 text-xs text-neon-blue">
                        {chatStatusLabel}
                      </span>
                    </div>
                  </div>
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-1">
                  {activeMessages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      id={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      index={index}
                      memoryRefs={message.memoryRefs}
                      fileUrl={message.fileUrl}
                      fileName={message.fileName}
                      fileType={message.fileType}
                      fileSize={message.fileSize}
                      messageState={message.messageState}
                      modelId={message.modelId}
                      provider={message.provider}
                      requestedModelId={message.requestedModelId}
                      processingMs={message.processingMs}
                      promptTokens={message.promptTokens}
                      completionTokens={message.completionTokens}
                      totalTokens={message.totalTokens}
                      autoMode={message.autoMode}
                      autoComplexity={message.autoComplexity}
                      fallbackUsed={message.fallbackUsed}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div
              ref={composerRef}
              className="absolute inset-x-0 bottom-0 z-20 border-t border-navy-800/60 bg-gradient-to-t from-navy-900 via-navy-900/98 to-navy-900/80 px-3 pb-3 pt-3 shadow-[0_-18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:px-4"
            >
              <div className="mx-auto max-w-3xl">
                <GrammarSuggestion
                  text={input}
                  onAccept={(corrected) => setInput(corrected)}
                  enabled
                  modelId={selectedModelId || activeModel?.id}
                />
                {smartRepliesEnabled ? (
                  <div className="mb-2">
                    <SmartReplies
                      messages={smartReplyMessages}
                      context="Solo AI chat"
                      enabled={smartRepliesEnabled}
                      modelId={selectedModelId || activeModel?.id}
                      onSelect={(reply) => setInput(reply)}
                    />
                  </div>
                ) : null}
                {selectedFile ? (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-navy-700/70 bg-navy-800/80 px-2.5 py-2 text-[10px] text-gray-300">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{selectedFile.name}</p>
                      <p className="text-gray-500">
                        {selectedFile.type || 'Unknown type'} | {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="rounded-lg p-1.5 text-gray-500 hover:text-white"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-navy-700/70 bg-navy-800/90 p-3 shadow-[0_0_0_1px_rgba(168,85,247,0.05)]">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 px-1">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Solo AI chat</p>
                      <p className="mt-1 text-xs text-gray-400">{chatStatusLabel}</p>
                    </div>
                    <div className="w-full sm:max-w-[16rem]">
                      <ModelSelector
                        selectedModelId={selectedModelId}
                        availableModels={availableModels}
                        groupedModels={groupedModels}
                        loadingModels={loadingModels}
                        emptyModelMessage={emptyModelMessage}
                        onChange={setSelectedModelId}
                        label="Response model"
                        compact
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/javascript,application/javascript,text/x-typescript,application/x-typescript"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-navy-700/70 p-2 text-gray-400 transition-colors hover:text-white"
                      type="button"
                    >
                      <Paperclip size={15} />
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void submit();
                        }
                      }}
                      rows={1}
                      placeholder="Ask anything..."
                      className="max-h-36 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <button
                      onClick={() => void submit()}
                      disabled={(!input.trim() && !selectedFile) || isLoading}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white disabled:opacity-40"
                      type="button"
                    >
                      {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside
          className={`overflow-hidden border-l border-navy-800/50 bg-navy-900/55 px-3 py-3 backdrop-blur-xl transition-all duration-300 ${
            rightSidebarOpen ? 'w-[18rem] translate-x-0 opacity-100' : 'w-0 translate-x-full border-l-0 px-0 opacity-0'
          }`}
          style={{ flexShrink: 0 }}
        >
          <div className="h-full min-w-[16rem] overflow-y-auto">
            <ConversationInsightsPanel
              heading="Conversation Insight"
              insight={activeConversation?.insight}
              loading={insightLoading}
              onAction={runInsight}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
