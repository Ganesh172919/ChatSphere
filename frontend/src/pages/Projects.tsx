import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, FolderKanban, Layers3, Loader2, MessagesSquare, Paperclip, Plus, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import SmartReplies from '../components/SmartReplies';
import GrammarSuggestion from '../components/GrammarSuggestion';
import ConversationInsightsPanel from '../components/ConversationInsightsPanel';
import { fetchAvailableModels, type AIModel } from '../api/ai';
import { runConversationAction } from '../api/conversations';
import { createProject, deleteProject, fetchProjects, updateProject, type ProjectFile, type ProjectSummary } from '../api/projects';
import { uploadFile } from '../api/rooms';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import { getModelGroups } from '../utils/aiModels';
import toast from 'react-hot-toast';

type ProjectForm = {
  name: string;
  description: string;
  instructions: string;
  context: string;
  prompts: string;
  files: ProjectFile[];
};

const emptyProject = (): ProjectForm => ({ name: '', description: '', instructions: '', context: '', prompts: '', files: [] });
const PROJECT_MODEL_STORAGE_KEY = 'chatsphere.project.model';
const mapProject = (project?: ProjectSummary | null): ProjectForm => project ? {
  name: project.name,
  description: project.description,
  instructions: project.instructions,
  context: project.context,
  prompts: project.suggestedPrompts.join('\n'),
  files: project.files,
} : emptyProject();

function formatActivity(date: string | null) {
  if (!date) return 'No chats yet';
  const value = new Date(date);
  const diffHours = Math.floor((Date.now() - value.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// --- Project listing page ---
function ProjectsList({ projects, loading, onOpen, onCreateNew }: {
  projects: ProjectSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <section className="mb-8 rounded-2xl border border-neon-purple/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.22),transparent_45%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_38%),rgba(18,20,31,0.94)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-neon-purple">Projects</p>
            <h1 className="font-display text-3xl font-bold text-white">Persistent AI workspaces for ongoing context.</h1>
            <p className="mt-2 text-xs leading-6 text-gray-400">
              Keep instructions, reference files, and all related chats together so ChatSphere can answer inside the same project context.
            </p>
          </div>
          <button onClick={onCreateNew} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-900/30" type="button">
            <Plus size={14} />New Project
          </button>
        </div>
      </section>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        {[
          { icon: FolderKanban, title: 'Persistent brief', text: 'Save project instructions, goals, and background once.' },
          { icon: FileText, title: 'Reusable files', text: 'Attach docs and notes that travel with every chat.' },
          { icon: Layers3, title: 'Focused history', text: 'Keep separate chat threads per project.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-navy-700/60 bg-navy-800/75 p-4 backdrop-blur-xl">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple/80 to-neon-blue/80">
              <Icon size={16} className="text-white" />
            </div>
            <h2 className="font-display text-sm font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-400">{text}</p>
          </div>
        ))}
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl border border-navy-700/50 bg-navy-800/70" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-navy-600/60 bg-navy-800/60 px-6 py-12 text-center">
          <MessagesSquare size={28} className="mx-auto mb-3 text-neon-purple" />
          <h2 className="font-display text-xl font-semibold text-white">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-gray-400">
            Create your first project to give ChatSphere a stable workspace with context, files, and dedicated conversations.
          </p>
          <button onClick={onCreateNew} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neon-purple/30 bg-neon-purple/10 px-3 py-1.5 text-xs font-medium text-neon-purple" type="button">
            Create a project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-xl border border-navy-700/60 bg-navy-800/80 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">Project</p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-white">{project.name}</h2>
                </div>
                <div className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2 py-0.5 text-[10px] font-medium text-neon-blue">
                  {project.conversationCount} chats
                </div>
              </div>
              <p className="mt-2 min-h-[3rem] text-xs leading-5 text-gray-400">
                {project.description || 'A reusable project workspace with dedicated context and files.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full border border-navy-600/60 bg-navy-900/50 px-2 py-0.5 text-[10px] text-gray-300">
                    #{tag}
                  </span>
                ))}
                {project.files.length > 0 ? (
                  <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[10px] text-neon-purple">
                    {project.files.length} file{project.files.length === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-gray-500">
                <span>{formatActivity(project.lastConversationAt || project.updatedAt)}</span>
                <button
                  onClick={() => onOpen(project.id)}
                  className="inline-flex items-center gap-1.5 font-medium text-white transition-colors hover:text-neon-purple text-xs"
                  type="button"
                >
                  Open workspace
                  <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}

// --- Project chat view ---
function ProjectChatView({ project, projects, onBack, onProjectChange }: {
  project: ProjectSummary;
  projects: ProjectSummary[];
  onBack: () => void;
  onProjectChange: (projects: ProjectSummary[]) => void;
}) {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [emptyModelMessage, setEmptyModelMessage] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectUploading, setProjectUploading] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>(mapProject(project));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeModel = availableModels.find((m) => m.id === selectedModelId) || availableModels[0] || null;
  const groupedModels = useMemo(() => getModelGroups(availableModels), [availableModels]);
  const { sendMessage, isLoading, removeConversation, startNewChat } = useChat(project);
  const { activeConversationId, conversations, updateConversationInsight } = useChatStore();
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversation?.messages || [];
  const completedMessages = useMemo(() => activeMessages.filter((m) => m.messageState !== 'pending'), [activeMessages]);
  const smartReplyMessages = useMemo(() => completedMessages.map((m) => ({ role: m.role, content: m.content })), [completedMessages]);
  const smartRepliesEnabled = Boolean(activeConversation && smartReplyMessages.length > 0 && smartReplyMessages[smartReplyMessages.length - 1]?.role === 'assistant' && !isLoading);

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await fetchAvailableModels();
        const visibleModels = result.models.filter((m) => m.id !== 'auto');
        setAvailableModels(visibleModels);
        setEmptyModelMessage(result.emptyStateMessage || '');
        const stored = localStorage.getItem(PROJECT_MODEL_STORAGE_KEY);
        const preferred = result.defaultModelId && result.defaultModelId !== 'auto' ? result.defaultModelId : visibleModels[0]?.id || '';
        setSelectedModelId(visibleModels.some((m) => m.id === stored) ? String(stored) : preferred);
      } catch {
        setAvailableModels([]);
        setSelectedModelId('');
        setEmptyModelMessage('No AI models configured.');
      } finally {
        setLoadingModels(false);
      }
    };
    void loadModels();
  }, []);

  useEffect(() => {
    if (selectedModelId) localStorage.setItem(PROJECT_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages.length, isLoading]);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '40px';
    el.style.height = `${Math.max(40, Math.min(el.scrollHeight, 160))}px`;
  }, [input]);

  const submit = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    if (!loadingModels && availableModels.length === 0) {
      toast.error(emptyModelMessage || 'No AI models configured.');
      return;
    }
    try {
      const attachment = selectedFile ? await uploadFile(selectedFile) : null;
      await sendMessage(input.trim() || `Please analyze the attached file: ${selectedFile?.name}`, {
        attachment,
        modelId: selectedModelId || activeModel?.id,
        project,
      });
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
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

  const saveProject = async () => {
    if (!projectForm.name.trim()) { toast.error('Project name is required'); return; }
    setProjectSaving(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        instructions: projectForm.instructions.trim(),
        context: projectForm.context.trim(),
        tags: [],
        suggestedPrompts: projectForm.prompts.split('\n').map((s) => s.trim()).filter(Boolean),
        files: projectForm.files.map((f) => ({ fileUrl: f.fileUrl, fileName: f.fileName, fileType: f.fileType, fileSize: f.fileSize, note: f.note || '' })),
      };
      await updateProject(project.id, payload);
      const refreshed = await fetchProjects();
      onProjectChange(refreshed);
      setProjectModalOpen(false);
      toast.success('Project updated');
    } catch { toast.error('Failed to save project'); }
    finally { setProjectSaving(false); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}"?`)) return;
    try {
      await deleteProject(project.id);
      onProjectChange(projects.filter((p) => p.id !== project.id));
      onBack();
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete project'); }
  };

  const uploadProjectFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProjectUploading(true);
    try {
      const uploaded: ProjectFile[] = [];
      for (const file of Array.from(files)) uploaded.push({ ...(await uploadFile(file)), note: '' });
      setProjectForm((c) => ({ ...c, files: [...c.files, ...uploaded] }));
    } catch { toast.error('Failed to upload file'); }
    finally { setProjectUploading(false); }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] mt-16 overflow-hidden">
      {/* Left sidebar — project info + conversations */}
      <aside className="hidden lg:flex w-[17rem] flex-col border-r border-navy-700/50 bg-navy-800 overflow-y-auto" style={{ flexShrink: 0 }}>
        <div className="p-3 border-b border-navy-700/50">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors mb-2" type="button">
            <ArrowLeft size={12} /> All Projects
          </button>
          <h2 className="font-display font-bold text-base text-white flex items-center gap-1.5">
            <FolderKanban size={14} className="text-neon-blue" />
            {project.name}
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
        </div>

        {/* Project details */}
        <div className="p-3 border-b border-navy-700/50 space-y-2">
          <div className="rounded-lg border border-navy-700/60 bg-navy-900/55 p-2.5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500 mb-1">Instructions</p>
            <p className="text-[10px] leading-4 text-gray-300 line-clamp-3">{project.instructions || 'No instructions set.'}</p>
          </div>
          {project.files.length > 0 && (
            <div className="rounded-lg border border-navy-700/60 bg-navy-900/55 p-2.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500 mb-1">Files ({project.files.length})</p>
              <div className="space-y-1">
                {project.files.slice(0, 3).map((file) => (
                  <a key={file.id || file.fileUrl} href={file.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] text-gray-300 hover:text-white">
                    <FileText size={10} className="flex-shrink-0" /> <span className="truncate">{file.fileName}</span> <ArrowUpRight size={8} className="flex-shrink-0" />
                  </a>
                ))}
                {project.files.length > 3 && <p className="text-[10px] text-gray-500">+{project.files.length - 3} more</p>}
              </div>
            </div>
          )}
          <button onClick={() => { setProjectForm(mapProject(project)); setProjectModalOpen(true); }} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-navy-700/60 px-2 py-1.5 text-[10px] text-gray-400 hover:text-white hover:border-neon-purple/30 transition-colors" type="button">
            <Settings2 size={10} /> Edit Project
          </button>
        </div>

        {/* Conversations */}
        <div className="p-3 flex-1 min-h-0 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Chats</p>
            <button onClick={startNewChat} className="rounded-lg border border-navy-700/70 px-2 py-0.5 text-[10px] text-gray-300" type="button">New</button>
          </div>
          <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-1">
            {conversations.length === 0 ? <div className="rounded-lg border border-dashed border-navy-700/70 px-3 py-4 text-center text-[10px] text-gray-400">Start a conversation</div> : conversations.map((c) => (
              <button key={c.id} onClick={() => useChatStore.getState().setActiveConversation(c.id)} className={`group w-full rounded-lg border px-2.5 py-1.5 text-left ${activeConversationId === c.id ? 'border-neon-purple/30 bg-neon-purple/10' : 'border-navy-700/60 bg-navy-900/60'}`} type="button">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium">{c.title}</p>
                    <p className="text-[9px] text-gray-500">{formatDate(c.updatedAt || c.createdAt)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); void removeConversation(c.id); }} className="rounded p-0.5 text-gray-500 opacity-0 group-hover:opacity-100" type="button"><Trash2 size={10} /></button>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Center — chat */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-navy-800/50 lg:hidden">
          <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:text-white" type="button"><ArrowLeft size={16} /></button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-white truncate">{project.name}</h2>
          </div>
        </div>

        {/* Model bar */}
        <div className="border-b border-navy-800/50 px-3 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-500 truncate">Project: {project.name}</span>
          <div className="flex items-center gap-2">
            <select value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} disabled={loadingModels || availableModels.length === 0} className="bg-transparent text-[10px] text-gray-300 focus:outline-none">
              {availableModels.length === 0 ? <option value="">No models</option> : null}
              {groupedModels.map((g) => (
                <optgroup key={g.provider} label={g.label}>{g.models.map((m) => <option key={m.id} value={m.id} className="bg-navy-900 text-white">{m.label}</option>)}</optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
          {!activeConversation || activeMessages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-4 py-6">
              <div className="rounded-xl border border-navy-700/60 bg-navy-800/70 p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue">
                  <FolderKanban className="text-white" size={20} />
                </div>
                <h2 className="font-display text-xl font-semibold">Chat with "{project.name}"</h2>
                <p className="mt-2 text-xs leading-5 text-gray-400">This workspace keeps your instructions, notes, files, and related chats together so the assistant stays inside the same project context.</p>
                {project.suggestedPrompts.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.suggestedPrompts.map((prompt) => (
                      <button key={prompt} onClick={() => { setInput(prompt); textareaRef.current?.focus(); }} className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-3 py-1 text-[10px] text-neon-purple" type="button">{prompt}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-1">
              {activeMessages.map((message, index) => <MessageBubble key={message.id} id={message.id} role={message.role} content={message.content} timestamp={message.timestamp} index={index} memoryRefs={message.memoryRefs} fileUrl={message.fileUrl} fileName={message.fileName} fileType={message.fileType} fileSize={message.fileSize} messageState={message.messageState} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-navy-800/50 px-3 py-2 flex-shrink-0">
          <div className="mx-auto max-w-3xl">
            <GrammarSuggestion text={input} onAccept={(corrected) => setInput(corrected)} enabled modelId={selectedModelId || activeModel?.id} />
            {smartRepliesEnabled ? <div className="mb-2"><SmartReplies messages={smartReplyMessages} context={`${project.name} project chat`} enabled={smartRepliesEnabled} modelId={selectedModelId || activeModel?.id} onSelect={(reply) => setInput(reply)} /></div> : null}
            {selectedFile ? <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-navy-700/70 bg-navy-800/80 px-2 py-1.5 text-[10px] text-gray-300"><div className="min-w-0"><p className="truncate font-medium">{selectedFile.name}</p><p className="text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button onClick={() => setSelectedFile(null)} className="p-1 text-gray-500 hover:text-white" type="button"><X size={10} /></button></div> : null}
            <div className="rounded-xl border border-navy-700/70 bg-navy-800/90 p-2">
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/javascript,application/javascript,text/x-typescript,application/x-typescript" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-navy-700/70 p-1.5 text-gray-400 hover:text-white" type="button"><Paperclip size={14} /></button>
                <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }} rows={1} placeholder={`Ask about ${project.name}...`} className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none" />
                <button onClick={() => void submit()} disabled={(!input.trim() && !selectedFile) || isLoading} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue text-white disabled:opacity-40" type="button">{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right sidebar — conversation insight */}
      <aside className="hidden xl:block w-[17rem] border-l border-navy-800/50 bg-navy-900/55 px-3 py-3 overflow-y-auto" style={{ flexShrink: 0 }}>
        <ConversationInsightsPanel heading="Conversation Insight" insight={activeConversation?.insight} loading={insightLoading} onAction={runInsight} />
      </aside>

      {/* Project edit modal */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-navy-700/70 bg-navy-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-700/60 px-5 py-3">
              <div><p className="text-[10px] uppercase tracking-[0.25em] text-neon-purple">Project</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Edit {project.name}</h2></div>
              <button onClick={() => setProjectModalOpen(false)} className="rounded-lg border border-navy-700/60 p-1.5 text-gray-400 hover:text-white" type="button"><X size={16} /></button>
            </div>
            <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
              <div className="space-y-3">
                <input value={projectForm.name} onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))} placeholder="Project name" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((c) => ({ ...c, description: e.target.value }))} rows={2} placeholder="Short description" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.instructions} onChange={(e) => setProjectForm((c) => ({ ...c, instructions: e.target.value }))} rows={4} placeholder="Project instructions" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
              </div>
              <div className="space-y-3">
                <textarea value={projectForm.context} onChange={(e) => setProjectForm((c) => ({ ...c, context: e.target.value }))} rows={4} placeholder="Context notes" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.prompts} onChange={(e) => setProjectForm((c) => ({ ...c, prompts: e.target.value }))} rows={3} placeholder={'Starter prompts\nOne per line'} className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-neon-purple/30 bg-neon-purple/10 px-3 py-2 text-xs text-neon-purple">{projectUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}Add files<input hidden multiple type="file" onChange={(e) => void uploadProjectFiles(e.target.files)} /></label>
                <div className="space-y-1.5">{projectForm.files.map((file, i) => <div key={`${file.fileUrl}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-navy-700/60 bg-navy-800/80 px-2 py-1.5 text-xs text-gray-300"><span className="truncate">{file.fileName}</span><button onClick={() => setProjectForm((c) => ({ ...c, files: c.files.filter((_, fi) => fi !== i) }))} className="p-0.5 text-gray-500 hover:text-white" type="button"><Trash2 size={10} /></button></div>)}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-navy-700/60 px-5 py-3">
              <button onClick={() => setProjectModalOpen(false)} className="rounded-lg border border-navy-700/70 px-3 py-1.5 text-xs text-gray-300" type="button">Cancel</button>
              <button onClick={() => void saveProject()} disabled={projectSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" type="button">{projectSaving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}Save</button>
              <button onClick={() => void handleDeleteProject()} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300" type="button">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---
export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectUploading, setProjectUploading] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject());
  const activeProjectId = searchParams.get('project');
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  useEffect(() => {
    const loadProjects = async () => {
      try { setProjects(await fetchProjects()); }
      catch { console.error('Failed to load projects'); }
      finally { setLoading(false); }
    };
    void loadProjects();
  }, []);

  const saveNewProject = async () => {
    if (!projectForm.name.trim()) { toast.error('Project name is required'); return; }
    setProjectSaving(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        instructions: projectForm.instructions.trim(),
        context: projectForm.context.trim(),
        tags: [],
        suggestedPrompts: projectForm.prompts.split('\n').map((s) => s.trim()).filter(Boolean),
        files: projectForm.files.map((f) => ({ fileUrl: f.fileUrl, fileName: f.fileName, fileType: f.fileType, fileSize: f.fileSize, note: f.note || '' })),
      };
      const saved = await createProject(payload);
      const refreshed = await fetchProjects();
      setProjects(refreshed);
      setSearchParams({ project: saved.id });
      setCreateModalOpen(false);
      setProjectForm(emptyProject());
      toast.success('Project created');
    } catch { toast.error('Failed to create project'); }
    finally { setProjectSaving(false); }
  };

  const uploadProjectFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProjectUploading(true);
    try {
      const uploaded: ProjectFile[] = [];
      for (const file of Array.from(files)) uploaded.push({ ...(await uploadFile(file)), note: '' });
      setProjectForm((c) => ({ ...c, files: [...c.files, ...uploaded] }));
    } catch { toast.error('Failed to upload file'); }
    finally { setProjectUploading(false); }
  };

  return (
    <div className="h-screen flex flex-col bg-navy-900 text-white overflow-hidden">
      <Navbar />

      {activeProject ? (
        <ProjectChatView
          project={activeProject}
          projects={projects}
          onBack={() => setSearchParams({})}
          onProjectChange={setProjects}
        />
      ) : (
        <div className="flex-1 overflow-y-auto mt-16">
          <ProjectsList
            projects={projects}
            loading={loading}
            onOpen={(id) => setSearchParams({ project: id })}
            onCreateNew={() => { setProjectForm(emptyProject()); setCreateModalOpen(true); }}
          />
        </div>
      )}

      {/* Create project modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-navy-700/70 bg-navy-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-700/60 px-5 py-3">
              <div><p className="text-[10px] uppercase tracking-[0.25em] text-neon-purple">New Project</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Create project</h2></div>
              <button onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-navy-700/60 p-1.5 text-gray-400 hover:text-white" type="button"><X size={16} /></button>
            </div>
            <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
              <div className="space-y-3">
                <input value={projectForm.name} onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))} placeholder="Project name" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.description} onChange={(e) => setProjectForm((c) => ({ ...c, description: e.target.value }))} rows={2} placeholder="Short description" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.instructions} onChange={(e) => setProjectForm((c) => ({ ...c, instructions: e.target.value }))} rows={4} placeholder="Project instructions" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
              </div>
              <div className="space-y-3">
                <textarea value={projectForm.context} onChange={(e) => setProjectForm((c) => ({ ...c, context: e.target.value }))} rows={4} placeholder="Context notes" className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <textarea value={projectForm.prompts} onChange={(e) => setProjectForm((c) => ({ ...c, prompts: e.target.value }))} rows={3} placeholder={'Starter prompts\nOne per line'} className="w-full rounded-lg border border-navy-700/70 bg-navy-800/90 px-3 py-2 text-xs text-white placeholder:text-gray-600" />
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-neon-purple/30 bg-neon-purple/10 px-3 py-2 text-xs text-neon-purple">{projectUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}Add files<input hidden multiple type="file" onChange={(e) => void uploadProjectFiles(e.target.files)} /></label>
                <div className="space-y-1.5">{projectForm.files.map((file, i) => <div key={`${file.fileUrl}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-navy-700/60 bg-navy-800/80 px-2 py-1.5 text-xs text-gray-300"><span className="truncate">{file.fileName}</span><button onClick={() => setProjectForm((c) => ({ ...c, files: c.files.filter((_, fi) => fi !== i) }))} className="p-0.5 text-gray-500 hover:text-white" type="button"><Trash2 size={10} /></button></div>)}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-navy-700/60 px-5 py-3">
              <button onClick={() => setCreateModalOpen(false)} className="rounded-lg border border-navy-700/70 px-3 py-1.5 text-xs text-gray-300" type="button">Cancel</button>
              <button onClick={() => void saveNewProject()} disabled={projectSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" type="button">{projectSaving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
