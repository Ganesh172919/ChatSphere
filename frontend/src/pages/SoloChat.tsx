import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Brain, FolderKanban, Loader2, Menu, Paperclip, Plus, Send, Settings2, Sparkles, Trash2, X } from 'lucide-react';
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
const SOLO_MODEL_STORAGE_KEY = 'chatsphere.solo.model';
const mapProject = (project?: ProjectSummary | null): ProjectForm => project ? {
  name: project.name,
  description: project.description,
  instructions: project.instructions,
  context: project.context,
  prompts: project.suggestedPrompts.join('\n'),
  files: project.files,
} : emptyProject();

const formatDate = (value?: string | null) => {
  if (!value) return 'No activity';
  const date = new Date(value);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

export default function SoloChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [emptyModelMessage, setEmptyModelMessage] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectUploading, setProjectUploading] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject());
  const [insightLoading, setInsightLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeProjectId = searchParams.get('project');
  const activeProject = projects.find((project) => project.id === activeProjectId) || null;
  const activeModel = availableModels.find((model) => model.id === selectedModelId) || availableModels[0] || null;
  const groupedModels = useMemo(() => getModelGroups(availableModels), [availableModels]);
  const { sendMessage, isLoading, removeConversation, startNewChat } = useChat(activeProject);
  const { activeConversationId, conversations, updateConversationInsight } = useChatStore();
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const activeMessages = activeConversation?.messages || [];
  const completedMessages = useMemo(() => activeMessages.filter((message) => message.messageState !== 'pending'), [activeMessages]);
  const smartReplyMessages = useMemo(() => completedMessages.map((message) => ({ role: message.role, content: message.content })), [completedMessages]);
  const smartRepliesEnabled = Boolean(activeConversation && smartReplyMessages.length > 0 && smartReplyMessages[smartReplyMessages.length - 1]?.role === 'assistant' && !isLoading);

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await fetchAvailableModels();
        const visibleModels = result.models.filter((model) => model.id !== 'auto');
        setAvailableModels(visibleModels);
        setEmptyModelMessage(result.emptyStateMessage || '');
        const stored = localStorage.getItem(SOLO_MODEL_STORAGE_KEY);
        const preferred = result.defaultModelId && result.defaultModelId !== 'auto'
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
    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        const data = await fetchProjects();
        setProjects(data);
        if (activeProjectId && !data.some((project) => project.id === activeProjectId)) setSearchParams({});
      } catch (error) {
        console.error('Failed to load projects', error);
      } finally {
        setProjectsLoading(false);
      }
    };
    void loadProjects();
  }, [activeProjectId, setSearchParams]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages.length, isLoading]);
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const openCreateProject = () => {
    setEditingProjectId(null);
    setProjectForm(emptyProject());
    setProjectModalOpen(true);
  };

  const openEditProject = () => {
    if (!activeProject) return;
    setEditingProjectId(activeProject.id);
    setProjectForm(mapProject(activeProject));
    setProjectModalOpen(true);
  };

  const saveProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setProjectSaving(true);
    try {
      const payload = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim(),
        instructions: projectForm.instructions.trim(),
        context: projectForm.context.trim(),
        tags: [],
        suggestedPrompts: projectForm.prompts.split('\n').map((item) => item.trim()).filter(Boolean),
        files: projectForm.files.map((file) => ({ fileUrl: file.fileUrl, fileName: file.fileName, fileType: file.fileType, fileSize: file.fileSize, note: file.note || '' })),
      };
      const saved = editingProjectId ? await updateProject(editingProjectId, payload) : await createProject(payload);
      setProjects(await fetchProjects());
      setSearchParams({ project: saved.id });
      setProjectModalOpen(false);
      toast.success(editingProjectId ? 'Project updated' : 'Project created');
    } catch (error) {
      console.error('Failed to save project', error);
      toast.error('Failed to save project');
    } finally {
      setProjectSaving(false);
    }
  };

  const uploadProjectFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProjectUploading(true);
    try {
      const uploaded: ProjectFile[] = [];
      for (const file of Array.from(files)) uploaded.push({ ...(await uploadFile(file)), note: '' });
      setProjectForm((current) => ({ ...current, files: [...current.files, ...uploaded] }));
    } catch (error) {
      console.error('Failed to upload project file', error);
      toast.error('Failed to upload project file');
    } finally {
      setProjectUploading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!window.confirm(`Delete "${activeProject.name}"? Existing chats will stay, but the project workspace will be removed.`)) return;
    try {
      await deleteProject(activeProject.id);
      setProjects((current) => current.filter((project) => project.id !== activeProject.id));
      setSearchParams({});
      setProjectModalOpen(false);
      toast.success('Project deleted');
    } catch (error) {
      console.error('Failed to delete project', error);
      toast.error('Failed to delete project');
    }
  };

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
        project: activeProject,
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

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),#0d0f1a] text-white">
      <Navbar />
      <div className="flex h-full pt-16">
        {sidebarOpen ? <button onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" type="button" /> : null}

        <aside className={`fixed inset-y-16 left-0 z-50 w-[21rem] border-r border-navy-700/60 bg-navy-900/95 px-4 py-4 backdrop-blur-xl transition-all duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-neon-purple">Workspace</p>
                <h2 className="mt-2 font-display text-xl font-semibold">Projects & chats</h2>
              </div>
              <button onClick={openCreateProject} className="rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue p-2.5" type="button"><Plus size={16} /></button>
            </div>

            <button onClick={() => setSearchParams({})} className={`mb-3 rounded-3xl border px-4 py-3 text-left ${!activeProject ? 'border-neon-purple/30 bg-neon-purple/10' : 'border-navy-700/60 bg-navy-800/70'}`} type="button">
              <p className="text-sm font-medium">General AI chat</p>
              <p className="mt-1 text-xs text-gray-500">Use ChatSphere without a project workspace</p>
            </button>

            <div className="mb-5 rounded-3xl border border-navy-700/60 bg-navy-800/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Your projects</p>
                <Link to="/projects" className="text-xs text-neon-purple">View all</Link>
              </div>
              <div className="max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                {projectsLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-navy-700/60" />) : projects.map((project) => (
                  <button key={project.id} onClick={() => { setSearchParams({ project: project.id }); setSidebarOpen(false); }} className={`w-full rounded-2xl border px-4 py-3 text-left ${activeProject?.id === project.id ? 'border-neon-blue/30 bg-neon-blue/10' : 'border-navy-700/60 bg-navy-900/60'}`} type="button">
                    <p className="truncate text-sm font-semibold">{project.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{project.description || 'Persistent context and files for this workspace.'}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-gray-500">{activeProject ? `${activeProject.name} chats` : 'Recent chats'}</p>
              <button onClick={startNewChat} className="rounded-xl border border-navy-700/70 px-3 py-1.5 text-xs text-gray-300" type="button">New chat</button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {conversations.length === 0 ? <div className="rounded-3xl border border-dashed border-navy-700/70 px-4 py-8 text-center text-sm text-gray-400">No conversations yet</div> : conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => useChatStore.getState().setActiveConversation(conversation.id)} className={`group w-full rounded-2xl border px-4 py-3 text-left ${activeConversationId === conversation.id ? 'border-neon-purple/30 bg-neon-purple/10' : 'border-navy-700/60 bg-navy-800/60'}`} type="button">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{conversation.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(conversation.updatedAt || conversation.createdAt)}</p>
                    </div>
                    <button onClick={(event) => { event.stopPropagation(); void removeConversation(conversation.id); }} className="rounded-xl p-1.5 text-gray-500 opacity-0 group-hover:opacity-100" type="button"><Trash2 size={14} /></button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 border-l border-navy-800/50">
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
            <header className="border-b border-navy-800/60 bg-navy-900/65 px-4 py-3 backdrop-blur-xl lg:px-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen((value) => !value)} className="rounded-2xl border border-navy-700/70 p-2 text-gray-300 lg:hidden" type="button"><Menu size={18} /></button>
                <div className="min-w-0 flex-1">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${activeProject ? 'border border-neon-blue/20 bg-neon-blue/10 text-neon-blue' : 'border border-neon-purple/20 bg-neon-purple/10 text-neon-purple'}`}>{activeProject ? 'Project workspace' : 'General workspace'}</span>
                  <h1 className="mt-2 truncate font-display text-2xl font-semibold">{activeProject?.name || activeConversation?.title || 'Stable AI conversation'}</h1>
                  <p className="mt-1 truncate text-sm text-gray-500">{activeProject?.description || 'A calmer chat surface with anchored input and focused threads.'}</p>
                </div>
                <div className="hidden min-w-[14rem] md:block">
                  <div className="rounded-2xl border border-navy-700/70 bg-navy-800/80 px-3 py-2">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-gray-500">Model</p>
                    <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} disabled={loadingModels || availableModels.length === 0} className="w-full bg-transparent text-sm font-medium text-white focus:outline-none">
                      {availableModels.length === 0 ? <option value="">No AI models configured</option> : null}
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
                </div>
                {activeProject ? <button onClick={openEditProject} className="hidden items-center gap-2 rounded-2xl border border-navy-700/70 px-4 py-2 text-sm text-gray-300 md:inline-flex" type="button"><Settings2 size={14} />Edit</button> : <button onClick={openCreateProject} className="hidden rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-sm font-semibold md:inline-flex" type="button">New project</button>}
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto px-4 py-5 lg:px-6">
              {!activeConversation || activeMessages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-4xl flex-col justify-center gap-6 py-8">
                  <div className="rounded-[2rem] border border-navy-700/60 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_45%),rgba(18,20,31,0.85)] p-8">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-neon-purple to-neon-blue">
                      {activeProject ? <FolderKanban className="text-white" size={28} /> : <Brain className="text-white" size={28} />}
                    </div>
                    <h2 className="font-display text-3xl font-semibold">{activeProject ? `Continue "${activeProject.name}"` : 'Ask anything, without the jumping composer'}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">{activeProject ? 'This workspace keeps your instructions, notes, files, and related chats together so the assistant stays inside the same project frame.' : 'Create a project when you want persistent files and reusable instructions, or stay in general chat for one-off questions.'}</p>
                    {activeProject?.suggestedPrompts.length ? <div className="mt-6 flex flex-wrap gap-2">{activeProject.suggestedPrompts.map((prompt) => <button key={prompt} onClick={() => { setInput(prompt); textareaRef.current?.focus(); }} className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-4 py-2 text-sm text-neon-purple" type="button">{prompt}</button>)}</div> : null}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-1">
                  {activeMessages.map((message, index) => <MessageBubble key={message.id} id={message.id} role={message.role} content={message.content} timestamp={message.timestamp} index={index} memoryRefs={message.memoryRefs} fileUrl={message.fileUrl} fileName={message.fileName} fileType={message.fileType} fileSize={message.fileSize} messageState={message.messageState} />)}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-navy-800/60 bg-gradient-to-t from-navy-900 via-navy-900/98 to-navy-900/75 px-4 pb-4 pt-3 backdrop-blur-xl lg:px-6">
              <div className="mx-auto max-w-3xl">
                <GrammarSuggestion text={input} onAccept={(corrected) => setInput(corrected)} enabled modelId={selectedModelId || activeModel?.id} />
                {smartRepliesEnabled ? <div className="mb-3"><SmartReplies messages={smartReplyMessages} context={activeProject ? `${activeProject.name} project chat` : 'Solo AI chat'} enabled={smartRepliesEnabled} modelId={selectedModelId || activeModel?.id} onSelect={(reply) => setInput(reply)} /></div> : null}
                {selectedFile ? <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-navy-700/70 bg-navy-800/80 px-3 py-3 text-xs text-gray-300"><div className="min-w-0"><p className="truncate font-medium">{selectedFile.name}</p><p className="text-gray-500">{selectedFile.type || 'Unknown type'} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button onClick={() => setSelectedFile(null)} className="rounded-xl p-2 text-gray-500 hover:text-white" type="button"><X size={14} /></button></div> : null}
                <div className="rounded-[1.75rem] border border-navy-700/70 bg-navy-800/90 p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.22)]">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[11px] text-gray-500"><div className="truncate">{activeProject ? `Active project: ${activeProject.name}` : 'General AI workspace with steady bottom composer'}</div><div className="truncate">{loadingModels ? 'Loading models...' : activeModel ? `Using ${activeModel.label}` : (emptyModelMessage || 'No AI models configured')}</div></div>
                  <div className="mb-3 md:hidden">
                    <div className="rounded-2xl border border-navy-700/70 bg-navy-900/55 px-3 py-2">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-gray-500">Model</p>
                      <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)} disabled={loadingModels || availableModels.length === 0} className="w-full bg-transparent text-sm font-medium text-white focus:outline-none">
                        {availableModels.length === 0 ? <option value="">No AI models configured</option> : null}
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
                  </div>
                  <div className="flex items-end gap-3">
                    <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/javascript,application/javascript,text/x-typescript,application/x-typescript" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
                    <button onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-navy-700/70 p-3 text-gray-400 hover:text-white" type="button"><Paperclip size={17} /></button>
                    <textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={1} placeholder={activeProject ? `Ask about ${activeProject.name}...` : 'Ask anything...'} className="max-h-44 min-h-[3.5rem] flex-1 resize-none bg-transparent px-1 py-3 text-sm text-white placeholder:text-gray-600" />
                    <button onClick={() => void submit()} disabled={(!input.trim() && !selectedFile) || isLoading} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue text-white disabled:opacity-40" type="button">{isLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[22rem] border-l border-navy-800/50 bg-navy-900/55 px-4 py-4 backdrop-blur-xl xl:block">
          <div className="h-full space-y-4 overflow-y-auto">
            <div className="rounded-[1.75rem] border border-navy-700/60 bg-navy-800/75 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-neon-purple">{activeProject ? 'Active project' : 'Project mode'}</p>
                  <h2 className="mt-2 font-display text-xl font-semibold">{activeProject?.name || 'Create a reusable workspace'}</h2>
                </div>
                {activeProject ? <button onClick={openEditProject} className="rounded-2xl border border-navy-700/70 p-2 text-gray-400 hover:text-white" type="button"><Settings2 size={15} /></button> : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-gray-400">{activeProject?.description || 'Projects give the assistant a persistent brief, related files, and dedicated chat history.'}</p>
              {activeProject ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-navy-700/60 bg-navy-900/55 p-4"><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Instructions</p><p className="mt-2 text-sm leading-6 text-gray-300">{activeProject.instructions || 'No project instructions yet.'}</p></div>
                  <div className="rounded-2xl border border-navy-700/60 bg-navy-900/55 p-4"><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Context notes</p><p className="mt-2 text-sm leading-6 text-gray-300">{activeProject.context || 'No project context notes yet.'}</p></div>
                  <div className="rounded-2xl border border-navy-700/60 bg-navy-900/55 p-4"><p className="text-xs uppercase tracking-[0.2em] text-gray-500">Files</p><div className="mt-3 space-y-2">{activeProject.files.length === 0 ? <p className="text-sm text-gray-500">No files attached.</p> : activeProject.files.map((file) => <a key={file.id || file.fileUrl} href={file.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-navy-700/60 bg-navy-800/80 px-3 py-3 text-sm text-gray-300 hover:border-neon-purple/30 hover:text-white"><div className="min-w-0"><p className="truncate font-medium">{file.fileName}</p><p className="text-xs text-gray-500">{file.fileType}</p></div><ArrowUpRight size={14} className="flex-shrink-0" /></a>)}</div></div>
                </div>
              ) : <button onClick={openCreateProject} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-sm font-semibold text-white" type="button"><Plus size={14} />Create project</button>}
            </div>
            <ConversationInsightsPanel heading="Conversation Insight" insight={activeConversation?.insight} loading={insightLoading} onAction={runInsight} />
          </div>
        </aside>
      </div>

      {projectModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-navy-700/70 bg-navy-900 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-navy-700/60 px-6 py-5"><div><p className="text-[11px] uppercase tracking-[0.3em] text-neon-purple">Project Workspace</p><h2 className="mt-2 font-display text-2xl font-semibold text-white">{editingProjectId ? 'Edit project' : 'Create project'}</h2></div><button onClick={() => setProjectModalOpen(false)} className="rounded-2xl border border-navy-700/60 p-2 text-gray-400 hover:text-white" type="button"><X size={18} /></button></div>
            <div className="grid gap-5 px-6 py-6 lg:grid-cols-2">
              <div className="space-y-4">
                <input value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} placeholder="Project name" className="w-full rounded-2xl border border-navy-700/70 bg-navy-800/90 px-4 py-3 text-sm text-white placeholder:text-gray-600" />
                <textarea value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Short description" className="w-full rounded-2xl border border-navy-700/70 bg-navy-800/90 px-4 py-3 text-sm text-white placeholder:text-gray-600" />
                <textarea value={projectForm.instructions} onChange={(event) => setProjectForm((current) => ({ ...current, instructions: event.target.value }))} rows={5} placeholder="Project instructions" className="w-full rounded-2xl border border-navy-700/70 bg-navy-800/90 px-4 py-3 text-sm text-white placeholder:text-gray-600" />
              </div>
              <div className="space-y-4">
                <textarea value={projectForm.context} onChange={(event) => setProjectForm((current) => ({ ...current, context: event.target.value }))} rows={5} placeholder="Project context notes" className="w-full rounded-2xl border border-navy-700/70 bg-navy-800/90 px-4 py-3 text-sm text-white placeholder:text-gray-600" />
                <textarea value={projectForm.prompts} onChange={(event) => setProjectForm((current) => ({ ...current, prompts: event.target.value }))} rows={4} placeholder={'Starter prompts\nOne per line'} className="w-full rounded-2xl border border-navy-700/70 bg-navy-800/90 px-4 py-3 text-sm text-white placeholder:text-gray-600" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-neon-purple/30 bg-neon-purple/10 px-4 py-3 text-sm text-neon-purple">{projectUploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}Add files<input hidden multiple type="file" onChange={(event) => void uploadProjectFiles(event.target.files)} /></label>
                <div className="space-y-2">{projectForm.files.map((file, index) => <div key={`${file.fileUrl}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-navy-700/60 bg-navy-800/80 px-3 py-3 text-sm text-gray-300"><span className="truncate">{file.fileName}</span><button onClick={() => setProjectForm((current) => ({ ...current, files: current.files.filter((_, fileIndex) => fileIndex !== index) }))} className="rounded-xl p-1 text-gray-500 hover:text-white" type="button"><Trash2 size={14} /></button></div>)}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-navy-700/60 px-6 py-5"><button onClick={() => setProjectModalOpen(false)} className="rounded-2xl border border-navy-700/70 px-4 py-2 text-sm text-gray-300" type="button">Cancel</button><button onClick={() => void saveProject()} disabled={projectSaving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" type="button">{projectSaving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}Save project</button>{activeProject && editingProjectId ? <button onClick={() => void handleDeleteProject()} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300" type="button">Delete</button> : null}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
