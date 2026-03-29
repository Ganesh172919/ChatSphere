import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { io } from "socket.io-client";
import InsightsPanel from "./components/insights/InsightsPanel";
import MemoryGraphPanel from "./components/memory/MemoryGraphPanel";
import PollBuilder from "./components/polls/PollBuilder";
import { API_BASE_URL, SOCKET_URL, createApiClient } from "./lib/api";

const DEFAULT_GROUP_FORM = {
  name: "",
  description: "",
  members: [],
};

const DEFAULT_IMPORT_FORM = {
  format: "json",
  sourceModel: "",
  name: "",
  rawText: "",
};

const DEFAULT_PROMPT_FORM = {
  title: "",
  content: "",
  scope: "GLOBAL",
  isActive: true,
};

const DEFAULT_POLL_STATE = {
  enabled: false,
  question: "",
  options: ["", ""],
  allowMulti: false,
  closesAt: "",
};

const QUICK_PROMPTS = [
  "Summarize the last 20 messages",
  "Draft a polite follow-up",
  "List action items from this chat",
  "Turn this discussion into a short plan",
];

const SLASH_COMMANDS = [
  { command: "/ai", description: "Ask the room assistant to answer inline." },
  { command: "/summarize", description: "Request a concise conversation summary." },
  { command: "/new", description: "Create a fresh solo AI conversation." },
];

const REACTION_OPTIONS = ["👍", "🔥", "❤️", "😂", "✅", "🤖"];
const PAGE_PATHS = {
  ai: "/ai",
  groups: "/groups",
  rooms: "/rooms",
  settings: "/settings",
};
const PRIMARY_PAGES = [
  { id: "ai", label: "AI Chat", description: "Solo conversations" },
  { id: "groups", label: "Groups", description: "Create and manage rooms" },
  { id: "rooms", label: "Rooms", description: "Direct and live chat spaces" },
  { id: "settings", label: "Settings", description: "Preferences and admin" },
];

const buildPublicUrl = (path) => {
  if (/^https?:\/\//i.test(path) || !API_BASE_URL) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!/^https?:\/\//i.test(API_BASE_URL)) {
    const normalizedBase = API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`;

    if (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`)) {
      return normalizedPath;
    }

    return `${normalizedBase}${normalizedPath}`;
  }

  return `${API_BASE_URL}${normalizedPath}`;
};

const emptyActiveChat = null;

const classNames = (...values) => values.filter(Boolean).join(" ");

const resolvePageFromPath = (pathname) => {
  const normalizedPath = pathname?.toLowerCase?.() || "/";

  if (normalizedPath.startsWith("/groups")) {
    return "groups";
  }

  if (normalizedPath.startsWith("/rooms")) {
    return "rooms";
  }

  if (normalizedPath.startsWith("/settings")) {
    return "settings";
  }

  return "ai";
};

const isChatAllowedOnPage = (chat, page) => {
  if (!chat) {
    return false;
  }

  if (page === "ai") {
    return chat.type === "SOLO";
  }

  if (page === "groups") {
    return chat.type === "GROUP";
  }

  if (page === "rooms") {
    return chat.type !== "SOLO";
  }

  return false;
};

const getTabsForPage = (page) => {
  if (page === "ai") {
    return [
      ["chat", "Chat"],
      ["memory", "Memory Graph"],
      ["intelligence", "Intelligence"],
      ["transfer", "Import / Export"],
    ];
  }

  if (page === "groups") {
    return [
      ["chat", "Overview"],
      ["intelligence", "Intelligence"],
    ];
  }

  if (page === "rooms") {
    return [
      ["chat", "Room"],
      ["intelligence", "Intelligence"],
    ];
  }

  return [];
};

const formatTimestamp = (value) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatRelativeLastSeen = (value) => {
  if (!value) {
    return "Offline";
  }

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) {
    return "Seen just now";
  }

  if (diff < 3_600_000) {
    return `Seen ${Math.floor(diff / 60_000)}m ago`;
  }

  if (diff < 86_400_000) {
    return `Seen ${Math.floor(diff / 3_600_000)}h ago`;
  }

  return `Seen ${Math.floor(diff / 86_400_000)}d ago`;
};

const parseJsonSafely = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const extractImportMessages = (rawText, format) => {
  if (!rawText.trim()) {
    throw new Error("Paste a conversation to import.");
  }

  if (format === "json") {
    const parsed = JSON.parse(rawText);
    const sources = [
      Array.isArray(parsed) ? parsed : null,
      parsed?.messages,
      parsed?.conversation?.messages,
      parsed?.chat?.messages,
      parsed?.data?.messages,
    ].filter(Boolean);

    const messages = sources[0];
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Unsupported JSON shape. Provide an array or an object with a messages array.");
    }

    return messages.map((message, index) => {
      const content =
        typeof message?.content === "string"
          ? message.content
          : typeof message?.text === "string"
            ? message.text
            : Array.isArray(message?.content)
              ? message.content.join("\n")
              : "";

      if (!content.trim()) {
        throw new Error(`Message ${index + 1} is missing content.`);
      }

      return {
        role: String(message?.role || message?.author || "user"),
        content: content.trim(),
        createdAt: message?.createdAt || message?.created_at || undefined,
        modelUsed: message?.modelUsed || message?.model || undefined,
      };
    });
  }

  const sections = rawText
    .split(/\n(?=##\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!sections.length) {
    const fallbackMessages = rawText
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk, index) => ({
        role: index % 2 === 0 ? "user" : "assistant",
        content: chunk,
      }));

    if (!fallbackMessages.length) {
      throw new Error("Unable to parse markdown conversation.");
    }

    return fallbackMessages;
  }

  return sections.map((section) => {
    const lines = section.split("\n");
    const header = lines.shift() || "";
    const role = /assistant|ai/i.test(header) ? "assistant" : "user";

    return {
      role,
      content: lines.join("\n").trim() || header.replace(/^##\s*/, "").trim(),
    };
  });
};

const downloadTextFile = (fileName, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const dedupeMessages = (messages) => {
  const seen = new Set();

  return messages.filter((message) => {
    if (!message?.id || seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });
};

const withUpdatedChatSummary = (chats, activeChat, nextMessage, currentUserId, unreadDelta = 0) =>
  chats
    .map((chat) => {
      if (chat.id !== activeChat.id) {
        return chat;
      }

      return {
        ...chat,
        name: activeChat.type === "DIRECT" ? chat.name : activeChat.name || chat.name,
        description: activeChat.description || chat.description,
        aiModel: activeChat.aiModel || chat.aiModel,
        members: activeChat.members || chat.members,
        membership: activeChat.membership || chat.membership,
        lastMessage: nextMessage
          ? {
              id: nextMessage.id,
              content: nextMessage.content,
              createdAt: nextMessage.createdAt,
              sender: {
                id: nextMessage.senderId,
                name:
                  nextMessage.type === "AI"
                    ? "AI"
                    : nextMessage.senderName || nextMessage.senderEmail || "Member",
              },
            }
          : chat.lastMessage,
        unreadCount:
          nextMessage && nextMessage.senderId !== currentUserId
            ? Math.max(0, (chat.unreadCount || 0) + unreadDelta)
            : chat.unreadCount || 0,
        updatedAt: nextMessage?.createdAt || new Date().toISOString(),
      };
    })
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

const getMessageStatus = (message, activeChat, currentUser, presenceMap) => {
  if (!activeChat || activeChat.type !== "DIRECT" || !currentUser) {
    return "";
  }

  if (message.senderId !== currentUser.id || message.type === "AI") {
    return "";
  }

  const peerMembership = activeChat.members?.find((member) => member.userId !== currentUser.id);
  const peerId = peerMembership?.userId;
  const peerLastReadAt = peerMembership?.lastReadAt ? new Date(peerMembership.lastReadAt).getTime() : 0;
  const createdAt = new Date(message.createdAt).getTime();

  if (peerLastReadAt && peerLastReadAt >= createdAt) {
    return "Read";
  }

  if (peerId && presenceMap[peerId]?.isOnline) {
    return "Delivered";
  }

  return "Sent";
};

const getTypingNames = (typingByChat, chatId, currentUser, members) => {
  const entries = Object.entries(typingByChat[chatId] || {}).filter(
    ([userId, value]) => value && userId !== currentUser?.id
  );

  return entries.map(([userId]) => {
    const member = members?.find((item) => item.userId === userId);
    return member?.user?.name || member?.user?.email || "Someone";
  });
};

function MarkdownMessage({ message, onCopyCode }) {
  const metadata = parseJsonSafely(message.metadata);
  const fileMeta = metadata?.attachment || null;

  return (
    <div className="message-body">
      {fileMeta ? (
        <a className="attachment-card" href={fileMeta.url} target="_blank" rel="noreferrer">
          <strong>{fileMeta.fileName}</strong>
          <span>{fileMeta.mimeType || "Attachment"}</span>
          <small>{Math.round((fileMeta.size || 0) / 1024)} KB</small>
        </a>
      ) : null}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }) {
            const language = className?.replace("language-", "") || "text";
            const text = String(children).replace(/\n$/, "");

            if (inline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="code-block">
                <div className="code-block__header">
                  <span>{language}</span>
                  <button type="button" onClick={() => onCopyCode(text)}>
                    Copy
                  </button>
                </div>
                <pre>
                  <code className={className} {...props}>
                    {text}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}

function AuthScreen({
  mode,
  authForm,
  onModeChange,
  onChange,
  onSubmit,
  loading,
  error,
  restoring,
}) {
  return (
    <div className="auth-shell">
      <div className="auth-backdrop" />
      <section className="auth-card">
        <div className="auth-copy">
          <span className="eyebrow">ChatSphere</span>
          <h1>AI chat and real-time collaboration in one premium workspace.</h1>
          <p>
            Solo AI threads, live rooms, inline room assistance, memory graph editing, conversation
            intelligence, imports, exports, and moderation tools in a single app.
          </p>
          <div className="shortcut-list">
            <span>Ctrl+K search</span>
            <span>Ctrl+N new solo</span>
            <span>/ai ask assistant</span>
          </div>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="auth-form__header">
            <span className="status-pill">{mode === "login" ? "Welcome back" : "Create account"}</span>
            <h2>{mode === "login" ? "Sign in" : "Get started"}</h2>
          </div>

          {mode === "register" ? (
            <label className="field">
              <span>Name</span>
              <input
                value={authForm.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Jane Doe"
                maxLength={60}
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={authForm.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? <div className="notice">{error}</div> : null}
          {restoring ? <div className="notice notice--info">Restoring your previous session...</div> : null}

          <button className="button button--primary" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            className="button button--ghost"
            onClick={() => onModeChange(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}

function SettingsDialog({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  notificationsEnabled,
  onEnableNotifications,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="modal-card__header">
          <div>
            <span className="eyebrow">Settings</span>
            <h2>Workspace preferences</h2>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="settings-grid">
          <article className="settings-item">
            <h3>Appearance</h3>
            <p>Switch between the premium dark workspace and a brighter daytime theme.</p>
            <div className="segmented-control">
              {["dark", "light"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={classNames("button button--segmented", theme === value && "is-active")}
                  onClick={() => onThemeChange(value)}
                >
                  {value === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </article>

          <article className="settings-item">
            <h3>Notifications</h3>
            <p>Get browser notifications for new messages when the app is in the background.</p>
            <button type="button" className="button button--secondary" onClick={onEnableNotifications}>
              {notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            </button>
          </article>

          <article className="settings-item">
            <h3>Keyboard shortcuts</h3>
            <ul className="shortcut-table">
              <li>
                <span>Search chats</span>
                <code>Ctrl+K</code>
              </li>
              <li>
                <span>New solo chat</span>
                <code>Ctrl+N</code>
              </li>
              <li>
                <span>Close drawers / reply</span>
                <code>Esc</code>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}

function ImportExportPanel({
  chat,
  importForm,
  onImportChange,
  onImportSubmit,
  onExport,
  loading,
}) {
  return (
    <section className="workspace-panel transfer-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Portability</span>
          <h2>Import and export conversation history</h2>
          <p>Move chats between providers, preserve server-backed history, and download markdown or JSON.</p>
        </div>

        {chat ? (
          <div className="row-actions">
            <button type="button" className="button button--secondary" onClick={() => onExport("json")}>
              Export JSON
            </button>
            <button type="button" className="button button--secondary" onClick={() => onExport("markdown")}>
              Export Markdown
            </button>
          </div>
        ) : null}
      </header>

      <div className="transfer-grid">
        <article className="card">
          <h3>Import external history</h3>
          <div className="form-grid">
            <label className="field">
              <span>Format</span>
              <select value={importForm.format} onChange={(event) => onImportChange("format", event.target.value)}>
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
              </select>
            </label>

            <label className="field">
              <span>Source model</span>
              <input
                value={importForm.sourceModel}
                onChange={(event) => onImportChange("sourceModel", event.target.value)}
                placeholder="claude-sonnet, gemini, gpt-4.1, ..."
              />
            </label>

            <label className="field">
              <span>Conversation name</span>
              <input
                value={importForm.name}
                onChange={(event) => onImportChange("name", event.target.value)}
                placeholder="Imported research notes"
              />
            </label>

            <label className="field field--full">
              <span>Conversation payload</span>
              <textarea
                value={importForm.rawText}
                onChange={(event) => onImportChange("rawText", event.target.value)}
                placeholder="Paste JSON array, object with messages, or markdown transcript..."
              />
            </label>
          </div>

          <button type="button" className="button button--primary" onClick={onImportSubmit} disabled={loading}>
            {loading ? "Importing..." : "Import conversation"}
          </button>
        </article>

        <article className="card">
          <h3>Supported shapes</h3>
          <ul className="stack-list">
            <li>JSON arrays of message objects with role and content.</li>
            <li>JSON objects containing a messages array anywhere in the common shapes.</li>
            <li>Markdown transcripts split by sections or double newlines.</li>
            <li>Exports from ChatSphere, ChatGPT-like logs, and other role/content conversations.</li>
          </ul>

          <div className="helper-box">
            <strong>Tip</strong>
            <p>
              Imported chats stay editable and exportable. If no provider keys are configured, AI still works using the
              local fallback response path on the backend.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function AdminPanel({
  analytics,
  flags,
  prompts,
  blocks,
  promptForm,
  onPromptFormChange,
  onPromptSubmit,
  onPromptDelete,
  onFlagStatusChange,
  onBlockUser,
  loading,
}) {
  return (
    <section className="workspace-panel admin-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h2>Analytics, moderation, blocking, and prompt management</h2>
          <p>Use the moderation queue, inspect totals, and manage reusable AI prompt templates.</p>
        </div>
      </header>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Users</span>
          <strong>{analytics?.totals?.users ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Chats</span>
          <strong>{analytics?.totals?.chats ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Messages</span>
          <strong>{analytics?.totals?.messages ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Open flags</span>
          <strong>{analytics?.totals?.openFlags ?? 0}</strong>
        </article>
      </div>

      <div className="admin-grid">
        <article className="card">
          <div className="card__header">
            <h3>Moderation queue</h3>
          </div>
          <div className="stack-list">
            {flags.length === 0 ? <p className="empty-copy">No moderation flags right now.</p> : null}
            {flags.map((flag) => (
              <div key={flag.id} className="admin-item">
                <div className="admin-item__topline">
                  <strong>{flag.message?.chat?.name || flag.message?.chat?.type || "Chat"}</strong>
                  <span className={`status-pill status-pill--${flag.status.toLowerCase()}`}>{flag.status}</span>
                </div>
                <p>{flag.reason}</p>
                <small>
                  Reported by {flag.reporter?.name || flag.reporter?.email} on {formatTimestamp(flag.createdAt)}
                </small>
                <div className="row-actions">
                  {["OPEN", "RESOLVED", "DISMISSED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="button button--ghost"
                      onClick={() => onFlagStatusChange(flag.id, status)}
                    >
                      {status}
                    </button>
                  ))}
                  {flag.message?.sender?.id ? (
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => onBlockUser(flag.message.sender.id)}
                    >
                      Block sender
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <h3>Prompt templates</h3>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Title</span>
              <input
                value={promptForm.title}
                onChange={(event) => onPromptFormChange("title", event.target.value)}
                placeholder="Meeting notes formatter"
              />
            </label>

            <label className="field">
              <span>Scope</span>
              <select value={promptForm.scope} onChange={(event) => onPromptFormChange("scope", event.target.value)}>
                <option value="GLOBAL">GLOBAL</option>
                <option value="GROUP">GROUP</option>
                <option value="SOLO">SOLO</option>
              </select>
            </label>

            <label className="field field--full">
              <span>Content</span>
              <textarea
                value={promptForm.content}
                onChange={(event) => onPromptFormChange("content", event.target.value)}
                placeholder="Summarize in bullets, highlight decisions, then list next steps."
              />
            </label>

            <label className="switch-row">
              <input
                type="checkbox"
                checked={promptForm.isActive}
                onChange={(event) => onPromptFormChange("isActive", event.target.checked)}
              />
              <span>Template is active</span>
            </label>
          </div>

          <button type="button" className="button button--primary" onClick={onPromptSubmit} disabled={loading}>
            {loading ? "Saving..." : "Create prompt template"}
          </button>

          <div className="stack-list">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="admin-item">
                <div className="admin-item__topline">
                  <strong>{prompt.title}</strong>
                  <span
                    className={classNames(
                      "status-pill",
                      prompt.isActive ? "status-pill--active" : "status-pill--muted"
                    )}
                  >
                    {prompt.scope}
                  </span>
                </div>
                <p>{prompt.content}</p>
                <div className="row-actions">
                  <button type="button" className="button button--danger" onClick={() => onPromptDelete(prompt.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card__header">
            <h3>Blocks</h3>
          </div>
          <div className="stack-list">
            {blocks.length === 0 ? <p className="empty-copy">No blocked users.</p> : null}
            {blocks.map((item) => (
              <div key={item.id} className="admin-item">
                <strong>{item.blocked?.name || item.blocked?.email}</strong>
                <small>Blocked by {item.blocker?.name || item.blocker?.email}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
export default function App() {
  const [currentPage, setCurrentPage] = useState(() => resolvePageFromPath(window.location.pathname));
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("chat");
  const [theme, setTheme] = useState(() => localStorage.getItem("chatsphere-theme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [activeChat, setActiveChat] = useState(emptyActiveChat);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [userPickerQuery, setUserPickerQuery] = useState("");
  const [userPickerResults, setUserPickerResults] = useState([]);
  const [groupForm, setGroupForm] = useState(DEFAULT_GROUP_FORM);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingByChat, setTypingByChat] = useState({});
  const [memoryGraph, setMemoryGraph] = useState({ nodes: [], edges: [] });
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [flags, setFlags] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [promptForm, setPromptForm] = useState(DEFAULT_PROMPT_FORM);
  const [importForm, setImportForm] = useState(DEFAULT_IMPORT_FORM);
  const [composerText, setComposerText] = useState("");
  const [composerBusy, setComposerBusy] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [pollState, setPollState] = useState(DEFAULT_POLL_STATE);
  const [streamingIds, setStreamingIds] = useState([]);

  const accessTokenRef = useRef(accessToken);
  const activeChatIdRef = useRef(activeChatId);
  const userRef = useRef(user);
  const sidebarSearchRef = useRef(null);
  const composerRef = useRef(null);
  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  if (!apiRef.current) {
    apiRef.current = createApiClient({
      getAccessToken: () => accessTokenRef.current,
      setAccessToken,
      onUnauthorized: () => {
        setUser(null);
        setChats([]);
        setActiveChat(emptyActiveChat);
        setActiveChatId("");
      },
    });
  }

  const api = apiRef.current;
  const presenceMap = onlineUsers.reduce((accumulator, entry) => {
    accumulator[entry.user?.id || entry.userId || entry.id] = {
      isOnline: entry.isOnline ?? true,
      lastSeenAt: entry.lastSeenAt || null,
    };
    return accumulator;
  }, {});

  const pushToast = (tone, title, description = "") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((current) => [...current, { id, tone, title, description }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3800);
  };

  const navigateToPage = (page, options = {}) => {
    const path = PAGE_PATHS[page] || PAGE_PATHS.ai;
    const method = options.replace ? "replaceState" : "pushState";

    if (window.location.pathname !== path) {
      window.history[method]({}, "", path);
    }

    setCurrentPage(page);
  };

  const publicRequest = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(buildPublicUrl(path), {
      ...options,
      headers,
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Request failed (${response.status})`);
    }

    return payload.data;
  };

  const sortAndSetChats = (nextChats, preferredChatId) => {
    const sorted = [...nextChats].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
    setChats(sorted);

    if (preferredChatId && sorted.some((chat) => chat.id === preferredChatId)) {
      setActiveChatId(preferredChatId);
      return;
    }

    if (!sorted.length) {
      setActiveChatId("");
      setActiveChat(emptyActiveChat);
      return;
    }

    if (!activeChatId || !sorted.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(sorted[0].id);
    }
  };

  const loadWorkspace = async (preferredChatId) => {
    if (!accessTokenRef.current) {
      return;
    }

    setWorkspaceLoading(true);

    try {
      const [currentUser, chatList, availableModels, online] = await Promise.all([
        api("/api/auth/me"),
        api("/api/chat"),
        api("/api/ai/models"),
        api("/api/chat/presence/online"),
      ]);

      setUser(currentUser);
      setModels(availableModels || []);
      setOnlineUsers(online || []);
      sortAndSetChats(chatList || [], preferredChatId);
    } catch (error) {
      pushToast("danger", "Unable to load workspace", error.message);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const restoreSession = async () => {
    setRestoringSession(true);

    try {
      const data = await publicRequest("/api/auth/refresh", { method: "POST" });
      if (!data?.accessToken) {
        setUser(null);
        return;
      }
      accessTokenRef.current = data.accessToken;
      setAccessToken(data.accessToken);
      await loadWorkspace();
    } catch {
      setUser(null);
    } finally {
      setRestoringSession(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(resolvePageFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("chatsphere-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (window.location.pathname === "/") {
      navigateToPage("ai", { replace: true });
    }
  }, [user]);

  useEffect(() => {
    if (currentPage === "settings") {
      setInfoPanelOpen(false);
      return;
    }

    const allowedTabs = getTabsForPage(currentPage).map(([value]) => value);
    if (allowedTabs.length && !allowedTabs.includes(workspaceTab)) {
      setWorkspaceTab(allowedTabs[0]);
    }
  }, [currentPage, workspaceTab]);

  useEffect(() => {
    if (!accessToken || currentPage === "settings") {
      return;
    }

    const allowedChats = chats.filter((chat) => isChatAllowedOnPage(chat, currentPage));

    if (!allowedChats.length) {
      setActiveChatId("");
      setActiveChat(emptyActiveChat);
      return;
    }

    if (!allowedChats.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(allowedChats[0].id);
    }
  }, [accessToken, currentPage, chats, activeChatId]);

  useEffect(() => {
    if (!activeChatId || !accessToken) {
      setActiveChat(emptyActiveChat);
      return;
    }

    const selectedChatSummary = chats.find((chat) => chat.id === activeChatId);
    if (currentPage !== "settings" && selectedChatSummary && !isChatAllowedOnPage(selectedChatSummary, currentPage)) {
      setActiveChat(emptyActiveChat);
      return;
    }

    let isActive = true;

    const run = async () => {
      try {
        const data = await api(`/api/chat/${activeChatId}`);
        if (!isActive) {
          return;
        }

        setActiveChat({
          ...data,
          messages: dedupeMessages(data.messages || []),
        });
        setSelectedModel(data.aiModel || models[0]?.id || "");
        setChats((current) =>
          current.map((chat) =>
            chat.id === data.id
              ? {
                  ...chat,
                  unreadCount: 0,
                  membership: data.members?.find((member) => member.userId === user?.id) || chat.membership,
                }
              : chat
          )
        );
      } catch (error) {
        pushToast("danger", "Unable to open chat", error.message);
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [activeChatId, accessToken, chats, currentPage]);

  useEffect(() => {
    if (workspaceTab !== "memory" || !accessToken) {
      return;
    }

    api("/api/memory/graph")
      .then((data) => setMemoryGraph(data || { nodes: [], edges: [] }))
      .catch((error) => pushToast("danger", "Unable to load memory graph", error.message));
  }, [workspaceTab, accessToken]);

  useEffect(() => {
    if (workspaceTab !== "intelligence" || !activeChatId || !accessToken) {
      return;
    }

    setInsightsLoading(true);

    api(`/api/insights/${activeChatId}`)
      .then((data) => setInsights(data || []))
      .catch((error) => pushToast("danger", "Unable to load insights", error.message))
      .finally(() => setInsightsLoading(false));
  }, [workspaceTab, activeChatId, accessToken]);

  useEffect(() => {
    if (workspaceTab !== "admin" || !user?.isAdmin || !accessToken) {
      return;
    }

    setAdminLoading(true);

    Promise.all([
      api("/api/admin/analytics"),
      api("/api/admin/moderation"),
      api("/api/admin/prompts"),
      api("/api/admin/blocks"),
    ])
      .then(([analyticsData, moderationData, promptData, blockData]) => {
        setAnalytics(analyticsData);
        setFlags(moderationData || []);
        setPrompts(promptData || []);
        setBlocks(blockData || []);
      })
      .catch((error) => pushToast("danger", "Unable to load admin data", error.message))
      .finally(() => setAdminLoading(false));
  }, [workspaceTab, user?.isAdmin, accessToken]);

  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL || window.location.origin, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });
    let attemptedRefresh = false;
    let reconnecting = false;

    socketRef.current = socket;

    socket.on("message:new", (message) => {
      setStreamingIds((current) => (message.type === "AI" ? [...current, message.id] : current));

      setChats((current) =>
        current
          .map((chat) => {
            if (chat.id !== message.chatId) {
              return chat;
            }

            return {
              ...chat,
              lastMessage: {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                sender: {
                  id: message.senderId,
                  name: message.type === "AI" ? "AI" : message.senderName || message.senderEmail || "Member",
                },
              },
              updatedAt: message.createdAt || new Date().toISOString(),
              unreadCount:
                message.senderId !== userRef.current?.id && message.chatId !== activeChatIdRef.current
                  ? (chat.unreadCount || 0) + 1
                  : chat.unreadCount || 0,
            };
          })
          .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
      );

      if (message.chatId === activeChatIdRef.current) {
        setActiveChat((current) =>
          current
            ? {
                ...current,
                messages: dedupeMessages([...(current.messages || []), message]),
              }
            : current
        );
      } else if (message.senderId !== userRef.current?.id) {
        pushToast("info", "New message", message.content.slice(0, 120));

        if (document.hidden && notificationsEnabled && Notification.permission === "granted") {
          new Notification(message.senderName || "ChatSphere", { body: message.content.slice(0, 160) });
        }
      }
    });

    socket.on("message:updated", (message) => {
      setActiveChat((current) =>
        current && current.id === message.chatId
          ? {
              ...current,
              messages: (current.messages || []).map((item) => (item.id === message.id ? message : item)),
            }
          : current
      );
    });

    socket.on("message:deleted", ({ messageId, chatId }) => {
      setActiveChat((current) =>
        current && current.id === chatId
          ? {
              ...current,
              messages: (current.messages || []).map((item) =>
                item.id === messageId ? { ...item, content: "[deleted]" } : item
              ),
            }
          : current
      );
    });

    socket.on("presence:update", (presence) => {
      setOnlineUsers((current) => {
        const next = current.filter((entry) => (entry.user?.id || entry.userId) !== presence.userId);

        if (presence.isOnline) {
          next.push({
            userId: presence.userId,
            isOnline: true,
            lastSeenAt: presence.lastSeenAt,
            user: current.find((entry) => (entry.user?.id || entry.userId) === presence.userId)?.user || null,
          });
        }

        return next;
      });
    });

    socket.on("typing:update", ({ chatId, userId, isTyping }) => {
      setTypingByChat((current) => ({
        ...current,
        [chatId]: {
          ...(current[chatId] || {}),
          [userId]: isTyping,
        },
      }));
    });

    socket.on("connect", () => {
      attemptedRefresh = false;
      reconnecting = false;
    });

    socket.on("connect_error", async () => {
      if (!attemptedRefresh && !reconnecting) {
        reconnecting = true;
        attemptedRefresh = true;

        try {
          const data = await publicRequest("/api/auth/refresh", { method: "POST" });
          if (data?.accessToken) {
            accessTokenRef.current = data.accessToken;
            setAccessToken(data.accessToken);
            return;
          }
        } catch {
          // Fall through to the toast below.
        } finally {
          reconnecting = false;
        }
      }

      pushToast(
        "danger",
        "Realtime connection issue",
        "Live updates could not reconnect automatically. Refresh the page if the problem continues."
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, notificationsEnabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeChatId) {
      return;
    }

    socket.emit("chat:join", { chatId: activeChatId });

    return () => {
      socket.emit("chat:leave", { chatId: activeChatId });
    };
  }, [activeChatId, socketRef.current]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const data = await api(`/api/chat/users/search?q=${encodeURIComponent(userPickerQuery)}`);
        setUserPickerResults(data || []);
      } catch {
        setUserPickerResults([]);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [userPickerQuery, accessToken]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        sidebarSearchRef.current?.focus();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n" && user) {
        event.preventDefault();
        handleCreateSoloChat(true);
      }

      if (event.key === "Escape") {
        setReplyTarget(null);
        setInfoPanelOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [user]);

  const handleAuthFieldChange = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async () => {
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await publicRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      accessTokenRef.current = data.accessToken;
      setAccessToken(data.accessToken);
      setAuthForm({ name: "", email: "", password: "" });
      await loadWorkspace();
      pushToast("success", authMode === "login" ? "Signed in" : "Account created", "Welcome to ChatSphere.");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout failures and clear local state anyway.
    }

    setAccessToken("");
    setUser(null);
    setChats([]);
    setActiveChatId("");
    setActiveChat(emptyActiveChat);
    navigateToPage("ai", { replace: true });
    pushToast("info", "Signed out", "Your session has been cleared.");
  };

  async function handleCreateSoloChat(fresh = true) {
    if (!accessToken) {
      return;
    }

    setComposerBusy(true);

    try {
      const chat = await api("/api/chat/solo", {
        method: "POST",
        body: JSON.stringify({
          fresh,
          model: selectedModel || models[0]?.id || "",
        }),
      });

      await loadWorkspace(chat.id);
      navigateToPage("ai");
      setWorkspaceTab("chat");
      setSidebarOpen(false);
      pushToast("success", "Solo AI chat ready", "A new conversation has been created.");
    } catch (error) {
      pushToast("danger", "Unable to create solo chat", error.message);
    } finally {
      setComposerBusy(false);
    }
  }

  const handleCreateDirectChat = async (targetUserId) => {
    try {
      const chat = await api("/api/chat/direct", {
        method: "POST",
        body: JSON.stringify({ userId: targetUserId }),
      });
      await loadWorkspace(chat.id);
      navigateToPage("rooms");
      setWorkspaceTab("chat");
      setSidebarOpen(false);
    } catch (error) {
      pushToast("danger", "Unable to start direct chat", error.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      pushToast("danger", "Group name required", "Add a room name before creating the group.");
      return;
    }

    try {
      const chat = await api("/api/chat/group", {
        method: "POST",
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim(),
          members: groupForm.members,
          aiModel: selectedModel || models[0]?.id || "",
        }),
      });

      setGroupForm(DEFAULT_GROUP_FORM);
      await loadWorkspace(chat.id);
      navigateToPage("groups");
      setWorkspaceTab("chat");
      setSidebarOpen(false);
      pushToast("success", "Group created", `${chat.name || "Room"} is ready.`);
    } catch (error) {
      pushToast("danger", "Unable to create group", error.message);
    }
  };

  const handleRefreshMemory = async () => {
    try {
      const data = await api("/api/memory/graph");
      setMemoryGraph(data || { nodes: [], edges: [] });
    } catch (error) {
      pushToast("danger", "Unable to refresh memory graph", error.message);
    }
  };

  const handleRefreshInsights = async () => {
    if (!activeChatId) {
      return;
    }

    setInsightsLoading(true);

    try {
      const data = await api(`/api/insights/${activeChatId}`);
      setInsights(data || []);
    } catch (error) {
      pushToast("danger", "Unable to refresh insights", error.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!activeChatId) {
      return;
    }

    setInsightsLoading(true);

    try {
      await api(`/api/insights/${activeChatId}/generate`, { method: "POST" });
      const data = await api(`/api/insights/${activeChatId}`);
      setInsights(data || []);
      pushToast("success", "Insights generated", "Conversation intelligence has been updated.");
    } catch (error) {
      pushToast("danger", "Unable to generate insights", error.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  const resetComposer = () => {
    setComposerText("");
    setReplyTarget(null);
    setAttachedFile(null);
    setPollState(DEFAULT_POLL_STATE);
  };

  const handleUploadAttachment = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api("/api/files/upload", { method: "POST", body: formData });
  };

  const handleSendMessage = async (overrideText) => {
    if (!activeChat) {
      pushToast("danger", "Select a chat first", "Choose a conversation or create a new one.");
      return;
    }

    let content = (overrideText ?? composerText).trim();
    let requestAiReply = activeChat.type === "SOLO";

    if (content.startsWith("/new")) {
      await handleCreateSoloChat(true);
      setComposerText("");
      return;
    }

    if (content.startsWith("/ai")) {
      content = content.replace(/^\/ai\s*/, "").trim();
      requestAiReply = true;
    }

    if (content.startsWith("/summarize")) {
      content = "Summarize the recent conversation in bullets and include next steps.";
      requestAiReply = true;
    }

    if (!content && !attachedFile) {
      pushToast("danger", "Message required", "Write a message or attach a file before sending.");
      return;
    }

    if (requestAiReply && activeChat.type === "DIRECT") {
      pushToast("danger", "AI is not available in direct chats", "Use a solo chat or group room for AI replies.");
      return;
    }

    setComposerBusy(true);

    try {
      let uploadedAttachment = null;
      if (attachedFile) {
        uploadedAttachment = await handleUploadAttachment(attachedFile);
      }

      if (!content && uploadedAttachment) {
        content =
          activeChat.type === "SOLO"
            ? `Please analyze the attached file: ${uploadedAttachment.fileName}`
            : `Shared file: ${uploadedAttachment.fileName}`;
      }

      const payload = {
        content,
        type: uploadedAttachment ? "FILE" : "TEXT",
        parentMessageId: replyTarget?.id || undefined,
        metadata: uploadedAttachment ? { attachment: uploadedAttachment } : undefined,
        modelUsed: selectedModel || activeChat.aiModel || undefined,
        requestAiReply,
        poll: pollState.enabled
          ? {
              question: pollState.question,
              options: pollState.options,
              allowMulti: pollState.allowMulti,
              closesAt: pollState.closesAt || undefined,
            }
          : undefined,
      };

      const response = await api(`/api/chats/${activeChat.id}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const nextMessages = dedupeMessages([
        ...(activeChat.messages || []),
        response.message,
        ...(response.aiMessage ? [response.aiMessage] : []),
      ]);

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: nextMessages,
            }
          : current
      );

      setChats((current) => withUpdatedChatSummary(current, activeChat, response.aiMessage || response.message, user?.id, 0));

      if (response.aiMessage?.id) {
        setStreamingIds((current) => [...current, response.aiMessage.id]);
      }

      if (response.aiWarning) {
        pushToast("info", "AI reply warning", response.aiWarning);
      }

      resetComposer();
      composerRef.current?.focus();
    } catch (error) {
      pushToast("danger", "Unable to send message", error.message);
    } finally {
      setComposerBusy(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message?")) {
      return;
    }

    try {
      await api(`/api/chats/${messageId}`, { method: "DELETE" });
      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).map((message) =>
                message.id === messageId ? { ...message, content: "[deleted]" } : message
              ),
            }
          : current
      );
    } catch (error) {
      pushToast("danger", "Unable to delete message", error.message);
    }
  };

  const handleEditMessage = async (message) => {
    const nextContent = window.prompt("Edit your message", message.content);
    if (!nextContent || nextContent.trim() === message.content) {
      return;
    }

    try {
      const updated = await api(`/api/chats/${message.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: nextContent }),
      });

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).map((item) => (item.id === updated.id ? updated : item)),
            }
          : current
      );
    } catch (error) {
      pushToast("danger", "Unable to edit message", error.message);
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      const result = await api(`/api/chats/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).map((item) => (item.id === messageId ? result.message : item)),
            }
          : current
      );
    } catch (error) {
      pushToast("danger", "Unable to react to message", error.message);
    }
  };

  const handlePinMessage = async (message, pinned) => {
    try {
      const updated = await api(`/api/chats/messages/${message.id}/pin`, {
        method: "POST",
        body: JSON.stringify({ pinned }),
      });

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).map((item) => (item.id === message.id ? updated : item)),
            }
          : current
      );
    } catch (error) {
      pushToast("danger", "Unable to update pin", error.message);
    }
  };

  const handleVotePoll = async (messageId, optionId) => {
    try {
      const result = await api(`/api/chats/messages/${messageId}/poll/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      });

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: (current.messages || []).map((item) => (item.id === messageId ? result.message : item)),
            }
          : current
      );
    } catch (error) {
      pushToast("danger", "Unable to record vote", error.message);
    }
  };

  const handleReportMessage = async (messageId) => {
    const reason = window.prompt("Why are you reporting this message?", "Inappropriate content");
    if (!reason) {
      return;
    }

    try {
      await api(`/api/chats/messages/${messageId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      pushToast("success", "Message reported", "The moderation queue has been updated.");
    } catch (error) {
      pushToast("danger", "Unable to report message", error.message);
    }
  };

  const handleChangeModel = async (nextModel) => {
    setSelectedModel(nextModel);

    if (!activeChatId) {
      return;
    }

    try {
      const updated = await api(`/api/chat/${activeChatId}`, {
        method: "PATCH",
        body: JSON.stringify({ aiModel: nextModel }),
      });

      setActiveChat((current) => (current ? { ...current, aiModel: updated.aiModel } : current));
      setChats((current) =>
        current.map((chat) => (chat.id === activeChatId ? { ...chat, aiModel: updated.aiModel } : chat))
      );
    } catch (error) {
      pushToast("danger", "Unable to update model", error.message);
    }
  };

  const handleAskAi = async () => {
    if (!activeChatId) {
      return;
    }

    const prompt =
      composerText.trim() || "Summarize the current conversation and highlight the next best actions.";

    if (activeChat?.type === "DIRECT") {
      pushToast("danger", "AI is not available in direct chats", "Switch to a solo or group conversation.");
      return;
    }

    setComposerBusy(true);

    try {
      const message = await api("/api/ai/prompt", {
        method: "POST",
        body: JSON.stringify({
          chatId: activeChatId,
          prompt,
          model: selectedModel || undefined,
        }),
      });

      setActiveChat((current) =>
        current
          ? {
              ...current,
              messages: dedupeMessages([...(current.messages || []), message]),
            }
          : current
      );
      setStreamingIds((current) => [...current, message.id]);
      setComposerText("");
    } catch (error) {
      pushToast("danger", "Unable to ask AI", error.message);
    } finally {
      setComposerBusy(false);
    }
  };

  const handleTyping = (value) => {
    setComposerText(value);

    const socket = socketRef.current;
    if (!socket || !activeChatId || activeChat?.type === "SOLO") {
      return;
    }

    socket.emit("typing:start", { chatId: activeChatId });

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      socket.emit("typing:stop", { chatId: activeChatId });
    }, 1200);
  };

  const handleVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      pushToast("danger", "Voice input not supported", "This browser does not expose the speech recognition API.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setVoiceListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setComposerText((current) => `${current}${current ? " " : ""}${transcript}`.trim());
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceListening(false);
    };

    recognition.onerror = () => {
      pushToast("danger", "Voice input failed", "The browser was not able to capture speech.");
    };

    recognitionRef.current = recognition;
    setVoiceListening(true);
    recognition.start();
  };

  const handleDropAttachment = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleCopyCode = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("success", "Copied", "Code block copied to your clipboard.");
    } catch {
      pushToast("danger", "Copy failed", "Clipboard access was not available.");
    }
  };

  const handleExport = async (format) => {
    if (!activeChatId) {
      return;
    }

    try {
      const data = await api(`/api/chat/${activeChatId}/export?format=${format}`);
      downloadTextFile(data.fileName, data.content);
      pushToast("success", "Export ready", `${data.fileName} has been downloaded.`);
    } catch (error) {
      pushToast("danger", "Unable to export chat", error.message);
    }
  };

  const handleImportSubmit = async () => {
    setTransferLoading(true);

    try {
      const messages = extractImportMessages(importForm.rawText, importForm.format);
      const chat = await api("/api/chat/import", {
        method: "POST",
        body: JSON.stringify({
          format: importForm.format,
          sourceModel: importForm.sourceModel.trim() || undefined,
          name: importForm.name.trim() || undefined,
          messages,
        }),
      });

      setImportForm(DEFAULT_IMPORT_FORM);
      await loadWorkspace(chat.id);
      navigateToPage("ai");
      setWorkspaceTab("chat");
      pushToast("success", "Conversation imported", "The imported history is now part of your workspace.");
    } catch (error) {
      pushToast("danger", "Unable to import conversation", error.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const handlePromptSubmit = async () => {
    try {
      const nextPrompt = await api("/api/admin/prompts", {
        method: "POST",
        body: JSON.stringify(promptForm),
      });

      setPrompts((current) => [nextPrompt, ...current]);
      setPromptForm(DEFAULT_PROMPT_FORM);
      pushToast("success", "Prompt template created", "Admin prompt routing has been updated.");
    } catch (error) {
      pushToast("danger", "Unable to save prompt", error.message);
    }
  };

  const handlePromptDelete = async (promptId) => {
    try {
      await api(`/api/admin/prompts/${promptId}`, { method: "DELETE" });
      setPrompts((current) => current.filter((prompt) => prompt.id !== promptId));
    } catch (error) {
      pushToast("danger", "Unable to delete prompt", error.message);
    }
  };

  const handleFlagStatusChange = async (flagId, status) => {
    try {
      const updated = await api(`/api/admin/moderation/${flagId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setFlags((current) => current.map((flag) => (flag.id === flagId ? { ...flag, status: updated.status } : flag)));
    } catch (error) {
      pushToast("danger", "Unable to update moderation flag", error.message);
    }
  };

  const handleBlockUser = async (targetUserId) => {
    try {
      const blocked = await api(`/api/admin/blocks/${targetUserId}`, { method: "POST" });
      setBlocks((current) => [blocked, ...current]);
      pushToast("success", "User blocked", "Messaging between these accounts will be prevented.");
    } catch (error) {
      pushToast("danger", "Unable to block user", error.message);
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      pushToast("danger", "Notifications unavailable", "This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");

    if (permission === "granted") {
      pushToast("success", "Notifications enabled", "New messages can now notify you in the background.");
    }
  };

  const filteredChats = chats.filter((chat) => {
    const query = sidebarQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const haystack = [chat.name, chat.description, chat.lastMessage?.content].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  const visibleMessages = (activeChat?.messages || []).filter((message) => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [message.content, message.senderName, message.senderEmail].join(" ").toLowerCase().includes(query);
  });

  const pinnedMessages = (activeChat?.messages || []).filter((message) => message.isPinned);
  const typingNames = getTypingNames(typingByChat, activeChatId, user, activeChat?.members || []);
  const showAdminTab = Boolean(user?.isAdmin);
  const soloChats = filteredChats.filter((chat) => chat.type === "SOLO");
  const groupChats = filteredChats.filter((chat) => chat.type === "GROUP");
  const roomChats = filteredChats.filter((chat) => chat.type !== "SOLO");
  const pageChats = filteredChats.filter((chat) => isChatAllowedOnPage(chat, currentPage));
  const pageTabs = getTabsForPage(currentPage);
  const roomsUnreadCount = roomChats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  const totalGroupMembers = groupChats.reduce((total, chat) => total + (chat.members?.length || 0), 0);

  const pageTitleMap = {
    ai: activeChat?.name || "AI Chat",
    groups: activeChat?.name || "Groups Hub",
    rooms: activeChat?.name || "Rooms",
    settings: "Workspace settings",
  };

  const pageDescriptionMap = {
    ai:
      activeChat?.description ||
      "Private AI conversations with memory, intelligence, model routing, and import/export tools.",
    groups:
      activeChat?.description ||
      "Create groups, manage members, and keep your shared rooms organized before jumping into the live room view.",
    rooms:
      activeChat?.description ||
      "Live direct messages and shared rooms with realtime messaging, polls, reactions, pins, and inline AI help.",
    settings: "Manage appearance, notifications, and the admin controls needed for local production-style runs.",
  };

  const openChatOnCurrentPage = (chatId) => {
    setActiveChatId(chatId);
    setWorkspaceTab("chat");
    setSidebarOpen(false);
  };

  const openChatInRoomsPage = (chatId) => {
    setActiveChatId(chatId);
    setWorkspaceTab("chat");
    setSidebarOpen(false);
    navigateToPage("rooms");
  };

  const handleAddSelectedMembersToActiveGroup = async () => {
    if (!activeChat || activeChat.type !== "GROUP") {
      pushToast("danger", "Select a group first", "Choose a group before adding people.");
      return;
    }

    const existingMemberIds = new Set((activeChat.members || []).map((member) => member.userId));
    const nextMemberIds = groupForm.members.filter((memberId) => !existingMemberIds.has(memberId));

    if (!nextMemberIds.length) {
      pushToast("info", "Nobody to add", "Pick at least one new person for this group.");
      return;
    }

    try {
      await Promise.all(
        nextMemberIds.map((memberId) =>
          api(`/api/chat/${activeChat.id}/members`, {
            method: "POST",
            body: JSON.stringify({ userId: memberId }),
          })
        )
      );

      setGroupForm((current) => ({ ...current, members: [] }));
      await loadWorkspace(activeChat.id);
      pushToast("success", "Members added", "The selected members are now part of this group.");
    } catch (error) {
      pushToast("danger", "Unable to add members", error.message);
    }
  };

  const handleRemoveGroupMember = async (targetUserId) => {
    if (!activeChat || activeChat.type !== "GROUP") {
      return;
    }

    try {
      await api(`/api/chat/${activeChat.id}/members/${targetUserId}`, { method: "DELETE" });
      await loadWorkspace(activeChat.id);
      pushToast("success", "Member removed", "The group membership has been updated.");
    } catch (error) {
      pushToast("danger", "Unable to remove member", error.message);
    }
  };

  const handleToggleGroupRole = async (member) => {
    if (!activeChat || activeChat.type !== "GROUP") {
      return;
    }

    const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";

    try {
      await api(`/api/chat/${activeChat.id}/members/${member.userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      await loadWorkspace(activeChat.id);
      pushToast("success", "Role updated", `${member.user?.name || member.user?.email || "Member"} is now ${nextRole.toLowerCase()}.`);
    } catch (error) {
      pushToast("danger", "Unable to change role", error.message);
    }
  };

  const renderConversationChatPanel = () => (
    <section className="workspace-panel chat-panel">
      {!activeChat ? (
        <div className="empty-state">
          <span className="eyebrow">{currentPage === "ai" ? "No AI thread" : "No active room"}</span>
          <h3>
            {currentPage === "ai"
              ? "Create a solo AI conversation to begin."
              : "Open a direct chat or group room to start messaging."}
          </h3>
          <p>
            {currentPage === "ai"
              ? "Model routing, memory, intelligence, and import/export are all ready in this workspace."
              : "Realtime messaging, reactions, polls, pins, file sharing, and inline AI are ready to use."}
          </p>
          <div className="row-actions">
            {currentPage === "ai" ? (
              <button type="button" className="button button--primary" onClick={() => handleCreateSoloChat(true)}>
                Start solo AI
              </button>
            ) : (
              <button type="button" className="button button--primary" onClick={() => navigateToPage("groups")}>
                Create a group
              </button>
            )}
            <button type="button" className="button button--secondary" onClick={() => setSidebarOpen(true)}>
              Browse conversations
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="chat-toolbar">
            <div className="chat-toolbar__search">
              <input
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Search in messages"
              />
            </div>

            <div className="row-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleAskAi}
                disabled={activeChat.type === "DIRECT" || composerBusy}
              >
                Ask AI
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => handleGenerateInsights()}
                disabled={!activeChatId}
              >
                Summarize
              </button>
            </div>
          </div>

          {pinnedMessages.length ? (
            <div className="pinned-strip">
              {pinnedMessages.map((message) => (
                <button key={message.id} type="button" className="pinned-pill" onClick={() => setMessageSearch(message.content)}>
                  {message.content.slice(0, 80)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="message-list">
            {visibleMessages.length === 0 ? <p className="empty-copy">No messages match the current filters.</p> : null}
            {visibleMessages.map((message) => {
              const isOwn = message.senderId === user.id && message.type !== "AI";
              const metadata = parseJsonSafely(message.metadata);
              return (
                <article
                  key={message.id}
                  className={classNames(
                    "message-card",
                    isOwn && "is-own",
                    message.type === "AI" && "is-ai",
                    streamingIds.includes(message.id) && "is-streaming"
                  )}
                >
                  <header className="message-card__header">
                    <div>
                      <strong>
                        {message.type === "AI"
                          ? "ChatSphere AI"
                          : message.senderName || message.senderEmail || "Member"}
                      </strong>
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </div>
                    <div className="message-card__status">
                      {message.modelUsed ? <span className="badge">{message.modelUsed}</span> : null}
                      {metadata?.provider ? <span className="badge">{metadata.provider}</span> : null}
                      {message.isPinned ? <span className="badge">Pinned</span> : null}
                    </div>
                  </header>

                  {message.parentMessageId ? <p className="reply-chip">Replying in thread</p> : null}

                  <MarkdownMessage message={message} onCopyCode={handleCopyCode} />

                  {message.poll ? (
                    <div className="poll-card">
                      <h4>{message.poll.question}</h4>
                      <div className="poll-options">
                        {message.poll.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={classNames("poll-option", option.voters?.includes(user.id) && "is-selected")}
                            onClick={() => handleVotePoll(message.id, option.id)}
                          >
                            <span>{option.text}</span>
                            <strong>{option.votes}</strong>
                          </button>
                        ))}
                      </div>
                      <small>
                        {message.poll.allowMulti ? "Multi-select enabled" : "Single choice"}{" "}
                        {message.poll.closesAt ? `• closes ${formatTimestamp(message.poll.closesAt)}` : ""}
                      </small>
                    </div>
                  ) : null}

                  <footer className="message-card__footer">
                    <div className="reaction-group">
                      {REACTION_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="reaction-button"
                          onClick={() => handleReactToMessage(message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                      {message.reactions?.length ? (
                        <div className="reaction-summary">
                          {message.reactions.map((reaction) => (
                            <span key={reaction.id} className="badge">
                              {reaction.emoji}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="row-actions">
                      <button type="button" className="button button--ghost" onClick={() => setReplyTarget(message)}>
                        Reply
                      </button>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => handlePinMessage(message, !message.isPinned)}
                      >
                        {message.isPinned ? "Unpin" : "Pin"}
                      </button>
                      {message.senderId === user.id && message.type !== "AI" ? (
                        <button type="button" className="button button--ghost" onClick={() => handleEditMessage(message)}>
                          Edit
                        </button>
                      ) : null}
                      <button type="button" className="button button--ghost" onClick={() => handleReportMessage(message.id)}>
                        Report
                      </button>
                      {(message.senderId === user.id || activeChat.membership?.role === "ADMIN") && message.type !== "AI" ? (
                        <button type="button" className="button button--danger" onClick={() => handleDeleteMessage(message.id)}>
                          Delete
                        </button>
                      ) : null}
                      {getMessageStatus(message, activeChat, user, presenceMap) ? (
                        <span className="message-status">{getMessageStatus(message, activeChat, user, presenceMap)}</span>
                      ) : null}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>

          {typingNames.length ? <p className="typing-indicator">{typingNames.join(", ")} typing...</p> : null}

          <div className="composer-shell">
            {replyTarget ? (
              <div className="reply-banner">
                <div>
                  <strong>Replying to {replyTarget.senderName || replyTarget.senderEmail || "message"}</strong>
                  <p>{replyTarget.content.slice(0, 140)}</p>
                </div>
                <button type="button" className="button button--ghost" onClick={() => setReplyTarget(null)}>
                  Cancel
                </button>
              </div>
            ) : null}

            {attachedFile ? (
              <div className="attachment-banner">
                <div>
                  <strong>{attachedFile.name}</strong>
                  <span>{Math.round(attachedFile.size / 1024)} KB</span>
                </div>
                <button type="button" className="button button--ghost" onClick={() => setAttachedFile(null)}>
                  Remove
                </button>
              </div>
            ) : null}

            <PollBuilder
              enabled={pollState.enabled}
              question={pollState.question}
              options={pollState.options}
              allowMulti={pollState.allowMulti}
              closesAt={pollState.closesAt}
              onToggle={(enabled) => setPollState((current) => ({ ...current, enabled }))}
              onQuestionChange={(question) => setPollState((current) => ({ ...current, question }))}
              onOptionChange={(index, value) =>
                setPollState((current) => ({
                  ...current,
                  options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
                }))
              }
              onAllowMultiChange={(allowMulti) => setPollState((current) => ({ ...current, allowMulti }))}
              onClosesAtChange={(closesAt) => setPollState((current) => ({ ...current, closesAt }))}
              onAddOption={() =>
                setPollState((current) => ({
                  ...current,
                  options: [...current.options, ""],
                }))
              }
              onRemoveOption={(index) =>
                setPollState((current) => ({
                  ...current,
                  options: current.options.filter((_, optionIndex) => optionIndex !== index),
                }))
              }
            />

            <div className="composer-panel">
              <textarea
                ref={composerRef}
                value={composerText}
                onChange={(event) => handleTyping(event.target.value)}
                placeholder={
                  activeChat.type === "SOLO"
                    ? "Ask anything, attach a file, or use /summarize"
                    : "Message the room, mention @ai, or use /ai for inline help"
                }
                rows={4}
              />

              <div className="composer-actions">
                <div className="row-actions">
                  <label className="button button--ghost file-button">
                    Upload
                    <input
                      type="file"
                      hidden
                      onChange={(event) => setAttachedFile(event.target.files?.[0] || null)}
                    />
                  </label>
                  <button type="button" className="button button--ghost" onClick={handleVoiceInput}>
                    {voiceListening ? "Stop voice" : "Voice input"}
                  </button>
                  <button
                    type="button"
                    className={classNames("button button--ghost", pollState.enabled && "is-active")}
                    onClick={() => setPollState((current) => ({ ...current, enabled: !current.enabled }))}
                  >
                    Poll
                  </button>
                </div>

                <div className="row-actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleAskAi}
                    disabled={activeChat.type === "DIRECT" || composerBusy}
                  >
                    Ask AI
                  </button>
                  <button type="button" className="button button--primary" onClick={() => handleSendMessage()} disabled={composerBusy}>
                    {composerBusy ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>

              <div className="composer-suggestions">
                <div className="chip-row">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" className="chip-button" onClick={() => setComposerText(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="slash-list">
                  {SLASH_COMMANDS.map((item) => (
                    <span key={item.command}>
                      <code>{item.command}</code> {item.description}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );

  const renderGroupsWorkspace = () => (
    <section className="groups-page">
      <div className="stats-grid">
        <article className="stat-card">
          <span>Total groups</span>
          <strong>{groupChats.length}</strong>
        </article>
        <article className="stat-card">
          <span>People across groups</span>
          <strong>{totalGroupMembers}</strong>
        </article>
        <article className="stat-card">
          <span>Online now</span>
          <strong>{onlineUsers.length}</strong>
        </article>
      </div>

      {!activeChat || activeChat.type !== "GROUP" ? (
        <section className="workspace-panel empty-state">
          <span className="eyebrow">Groups</span>
          <h3>Create your first group or select one from the sidebar.</h3>
          <p>Use the member picker on the left to assemble a room, then open it in the Rooms page for live chat.</p>
          <div className="row-actions">
            <button type="button" className="button button--primary" onClick={() => setSidebarOpen(true)}>
              Create group
            </button>
            <button type="button" className="button button--secondary" onClick={() => navigateToPage("rooms")}>
              Open rooms page
            </button>
          </div>
        </section>
      ) : (
        <div className="groups-layout">
          <section className="workspace-panel">
            <header className="panel-header">
              <div>
                <span className="eyebrow">Active group</span>
                <h2>{activeChat.name}</h2>
                <p>{activeChat.description || "No description provided for this group yet."}</p>
              </div>
              <div className="row-actions">
                <button type="button" className="button button--secondary" onClick={() => openChatInRoomsPage(activeChat.id)}>
                  Open room
                </button>
                <button type="button" className="button button--ghost" onClick={handleGenerateInsights}>
                  Refresh intelligence
                </button>
              </div>
            </header>

            <div className="stats-grid">
              <article className="stat-card">
                <span>Members</span>
                <strong>{activeChat.members?.length || 0}</strong>
              </article>
              <article className="stat-card">
                <span>Pinned messages</span>
                <strong>{pinnedMessages.length}</strong>
              </article>
              <article className="stat-card">
                <span>Model</span>
                <strong>{activeChat.aiModel || "Default"}</strong>
              </article>
            </div>

            <div className="card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Member picker</span>
                  <h3>Add selected people to this group</h3>
                </div>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleAddSelectedMembersToActiveGroup}
                  disabled={activeChat.membership?.role !== "ADMIN"}
                >
                  Add selected ({groupForm.members.length})
                </button>
              </div>
              <p className="empty-copy">
                Search users in the sidebar, mark them with <code>Add</code>, then use this action to attach them to the current group.
              </p>
            </div>
          </section>

          <section className="workspace-panel">
            <header className="panel-header">
              <div>
                <span className="eyebrow">Members</span>
                <h2>Roles and access</h2>
                <p>Promote admins, remove members, and keep the room ready for production-style local usage.</p>
              </div>
            </header>

            <div className="stack-list">
              {(activeChat.members || []).map((member) => {
                const isSelf = member.userId === user.id;
                const canManage = activeChat.membership?.role === "ADMIN" && !isSelf;

                return (
                  <article key={member.id} className="admin-item">
                    <div className="participant-row">
                      <div>
                        <strong>{member.user?.name || member.user?.email || "Member"}</strong>
                        <span>{member.user?.email}</span>
                      </div>
                      <small>{presenceMap[member.userId]?.isOnline ? "Online" : "Offline"}</small>
                    </div>

                    <div className="row-actions">
                      <span className={classNames("status-pill", member.role === "ADMIN" && "status-pill--active")}>
                        {member.role}
                      </span>
                      {canManage ? (
                        <button type="button" className="button button--ghost" onClick={() => handleToggleGroupRole(member)}>
                          {member.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                      ) : null}
                      {canManage ? (
                        <button type="button" className="button button--danger" onClick={() => handleRemoveGroupMember(member.userId)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );

  const renderSettingsWorkspace = () => (
    <section className="settings-page">
      <section className="workspace-panel">
        <header className="panel-header">
          <div>
            <span className="eyebrow">Settings</span>
            <h2>Workspace preferences</h2>
            <p>Control the local production-style experience, appearance, notifications, and admin tools.</p>
          </div>
          <div className="row-actions">
            <button type="button" className="button button--secondary" onClick={handleEnableNotifications}>
              {notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
            </button>
            <button type="button" className="button button--ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="settings-grid">
          <article className="settings-item">
            <h3>Appearance</h3>
            <p>Switch between the dark workspace and a lighter daytime theme.</p>
            <div className="segmented-control">
              {["dark", "light"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={classNames("button button--segmented", theme === value && "is-active")}
                  onClick={() => setTheme(value)}
                >
                  {value === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </article>

          <article className="settings-item">
            <h3>Workspace status</h3>
            <ul className="shortcut-table">
              <li>
                <span>Current user</span>
                <code>{user.name || user.email}</code>
              </li>
              <li>
                <span>Role</span>
                <code>{user.isAdmin ? "ADMIN" : "MEMBER"}</code>
              </li>
              <li>
                <span>Live users</span>
                <code>{onlineUsers.length}</code>
              </li>
            </ul>
          </article>

          <article className="settings-item">
            <h3>Keyboard shortcuts</h3>
            <ul className="shortcut-table">
              <li>
                <span>Search chats</span>
                <code>Ctrl+K</code>
              </li>
              <li>
                <span>New solo chat</span>
                <code>Ctrl+N</code>
              </li>
              <li>
                <span>Close side panels</span>
                <code>Esc</code>
              </li>
            </ul>
          </article>
        </div>
      </section>

      {showAdminTab ? (
        <AdminPanel
          analytics={analytics}
          flags={flags}
          prompts={prompts}
          blocks={blocks}
          promptForm={promptForm}
          onPromptFormChange={(field, value) => setPromptForm((current) => ({ ...current, [field]: value }))}
          onPromptSubmit={handlePromptSubmit}
          onPromptDelete={handlePromptDelete}
          onFlagStatusChange={handleFlagStatusChange}
          onBlockUser={handleBlockUser}
          loading={adminLoading}
        />
      ) : null}
    </section>
  );

  const activePrimaryPage = PRIMARY_PAGES.find((page) => page.id === currentPage) || PRIMARY_PAGES[0];
  const showConversationAside =
    Boolean(activeChat) &&
    infoPanelOpen &&
    workspaceTab === "chat" &&
    (currentPage === "ai" || currentPage === "rooms");

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        authForm={authForm}
        onModeChange={(nextMode) => {
          setAuthMode(nextMode);
          setAuthError("");
        }}
        onChange={handleAuthFieldChange}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
        error={authError}
        restoring={restoringSession}
      />
    );
  }

  return (
    <div className="app-shell" onDrop={handleDropAttachment} onDragOver={(event) => event.preventDefault()}>
      <aside className={classNames("sidebar", sidebarOpen && "is-open")}>
        <div className="brand-card">
          <div>
            <span className="eyebrow">ChatSphere</span>
            <h1>Fast AI and live messaging</h1>
            <p>{user.name || user.email}</p>
          </div>

          <div className="brand-card__actions">
            <button type="button" className="button button--ghost" onClick={() => navigateToPage("settings")}>
              Settings
            </button>
            <button type="button" className="button button--ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section__header">
            <h2>
              {currentPage === "ai"
                ? "AI Tools"
                : currentPage === "groups"
                  ? "Groups Hub"
                  : currentPage === "rooms"
                    ? "Start a Room"
                    : "Quick Actions"}
            </h2>
            <button type="button" className="button button--secondary" onClick={() => setSidebarOpen(false)}>
              Hide
            </button>
          </div>

          {currentPage === "ai" ? (
            <>
              <button type="button" className="button button--primary" onClick={() => handleCreateSoloChat(true)}>
                New solo AI chat
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  navigateToPage("ai");
                  setWorkspaceTab("transfer");
                  setSidebarOpen(false);
                }}
              >
                Import external history
              </button>
              <div className="helper-box">
                <strong>AI Workspace</strong>
                <p>Use saved solo threads, memory graph editing, intelligence, and model routing from one place.</p>
              </div>
            </>
          ) : null}

          {currentPage === "groups" ? (
            <>
              <label className="field">
                <span>Search users</span>
                <input
                  value={userPickerQuery}
                  onChange={(event) => setUserPickerQuery(event.target.value)}
                  placeholder="Find teammates"
                />
              </label>

              <div className="picker-list">
                {userPickerResults.map((person) => (
                  <article key={person.id} className="picker-item">
                    <div>
                      <strong>{person.name || "Unnamed user"}</strong>
                      <span>{person.email}</span>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className={classNames("button button--ghost", groupForm.members.includes(person.id) && "is-active")}
                        onClick={() =>
                          setGroupForm((current) => ({
                            ...current,
                            members: current.members.includes(person.id)
                              ? current.members.filter((id) => id !== person.id)
                              : [...current.members, person.id],
                          }))
                        }
                      >
                        {groupForm.members.includes(person.id) ? "Selected" : "Add"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <label className="field">
                <span>Group name</span>
                <input
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Design review room"
                />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  value={groupForm.description}
                  onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Shared roadmap and handoff space"
                />
              </label>

              <div className="row-actions">
                <button type="button" className="button button--primary" onClick={handleCreateGroup}>
                  Create group ({groupForm.members.length})
                </button>
                <button type="button" className="button button--ghost" onClick={() => navigateToPage("rooms")}>
                  Open rooms
                </button>
              </div>
            </>
          ) : null}

          {currentPage === "rooms" ? (
            <>
              <label className="field">
                <span>Search users</span>
                <input
                  value={userPickerQuery}
                  onChange={(event) => setUserPickerQuery(event.target.value)}
                  placeholder="Start a direct message"
                />
              </label>

              <div className="picker-list">
                {userPickerResults.map((person) => (
                  <article key={person.id} className="picker-item">
                    <div>
                      <strong>{person.name || "Unnamed user"}</strong>
                      <span>{person.email}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="button button--ghost" onClick={() => handleCreateDirectChat(person.id)}>
                        DM
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="helper-box">
                <strong>Live messaging</strong>
                <p>Open direct chats and shared rooms here, with realtime status, polls, reactions, and inline AI help.</p>
              </div>

              <button type="button" className="button button--secondary" onClick={() => navigateToPage("groups")}>
                Manage groups
              </button>
            </>
          ) : null}

          {currentPage === "settings" ? (
            <>
              <button type="button" className="button button--secondary" onClick={handleEnableNotifications}>
                {notificationsEnabled ? "Notifications enabled" : "Enable notifications"}
              </button>
              <div className="segmented-control">
                {["dark", "light"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={classNames("button button--segmented", theme === value && "is-active")}
                    onClick={() => setTheme(value)}
                  >
                    {value === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
              <div className="helper-box">
                <strong>Local production setup</strong>
                <p>This page keeps theme, notifications, admin access, and navigation in one predictable place.</p>
              </div>
            </>
          ) : null}
        </div>

        {currentPage === "settings" ? (
          <div className="sidebar-section sidebar-section--fill">
            <div className="sidebar-section__header">
              <h2>Workspace Overview</h2>
              <span className="status-pill">{user.isAdmin ? "ADMIN" : "MEMBER"}</span>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <span>Solo chats</span>
                <strong>{soloChats.length}</strong>
              </article>
              <article className="stat-card">
                <span>Groups</span>
                <strong>{groupChats.length}</strong>
              </article>
              <article className="stat-card">
                <span>Unread</span>
                <strong>{roomsUnreadCount}</strong>
              </article>
            </div>

            <div className="helper-box">
              <strong>Navigation</strong>
              <p>Use the top bar to move between AI Chat, Groups, Rooms, and Settings without losing synced conversations.</p>
            </div>
          </div>
        ) : (
          <div className="sidebar-section sidebar-section--fill">
            <div className="sidebar-section__header">
              <h2>{currentPage === "ai" ? "AI Threads" : currentPage === "groups" ? "Groups" : "Rooms"}</h2>
              <span className="status-pill">{pageChats.length}</span>
            </div>
            <input
              ref={sidebarSearchRef}
              value={sidebarQuery}
              onChange={(event) => setSidebarQuery(event.target.value)}
              placeholder={
                currentPage === "ai"
                  ? "Search AI conversations"
                  : currentPage === "groups"
                    ? "Search groups"
                    : "Search rooms and DMs"
              }
            />

            <div className="chat-list">
              {pageChats.length === 0 ? (
                <p className="empty-copy">
                  {currentPage === "ai"
                    ? "No solo AI conversations match the current filters."
                    : currentPage === "groups"
                      ? "No groups found yet. Create one from the sidebar."
                      : "No direct messages or rooms match the current filters."}
                </p>
              ) : null}
              {pageChats.map((chat) => {
                const peerPresence = chat.directPeerPresence;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    className={classNames("chat-card", chat.id === activeChatId && "is-active")}
                    onClick={() => openChatOnCurrentPage(chat.id)}
                  >
                    <div className="chat-card__topline">
                      <strong>{chat.name || chat.type}</strong>
                      <span>{formatTimestamp(chat.updatedAt)}</span>
                    </div>
                    <div className="chat-card__meta">
                      <span>{chat.type}</span>
                      {chat.unreadCount ? <span className="badge">{chat.unreadCount}</span> : null}
                      {peerPresence?.isOnline ? <span className="presence-pill">Online</span> : null}
                    </div>
                    <p>{chat.lastMessage?.content || chat.description || "No messages yet."}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section__header">
            <h2>{currentPage === "settings" ? "Environment" : "Presence"}</h2>
            <span className="status-pill">{currentPage === "settings" ? "Local" : onlineUsers.length}</span>
          </div>

          {currentPage === "settings" ? (
            <div className="stack-list">
              <div className="metric-row">
                <span>Current route</span>
                <strong>{PAGE_PATHS[currentPage]}</strong>
              </div>
              <div className="metric-row">
                <span>Models loaded</span>
                <strong>{models.length}</strong>
              </div>
              <div className="metric-row">
                <span>Realtime users</span>
                <strong>{onlineUsers.length}</strong>
              </div>
            </div>
          ) : (
            <div className="presence-list">
              {onlineUsers.length === 0 ? <p className="empty-copy">Nobody is online yet.</p> : null}
              {onlineUsers.map((entry) => (
                <div key={entry.user?.id || entry.userId} className="presence-item">
                  <span className="presence-dot" />
                  <div>
                    <strong>{entry.user?.name || entry.user?.email || "Member"}</strong>
                    <span>{entry.isOnline ? "Online now" : formatRelativeLastSeen(entry.lastSeenAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="workspace-header__title">
            <button type="button" className="button button--ghost mobile-only" onClick={() => setSidebarOpen((current) => !current)}>
              Menu
            </button>
            <div>
              <span className="eyebrow">{activePrimaryPage.label}</span>
              <h2>{pageTitleMap[currentPage]}</h2>
              <p>{pageDescriptionMap[currentPage]}</p>
            </div>
          </div>

          <div className="workspace-header__actions">
            <nav className="primary-nav" aria-label="Primary pages">
              {PRIMARY_PAGES.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={classNames("primary-nav__button", currentPage === page.id && "is-active")}
                  onClick={() => navigateToPage(page.id)}
                >
                  <span>{page.label}</span>
                  {page.id === "rooms" && roomsUnreadCount ? <small>{roomsUnreadCount} unread</small> : null}
                  {page.id === "groups" ? <small>{groupChats.length} groups</small> : null}
                </button>
              ))}
            </nav>

            {currentPage !== "settings" ? (
              <>
                <label className="field field--compact">
                  <span>Model</span>
                  <select value={selectedModel} onChange={(event) => handleChangeModel(event.target.value)}>
                    <option value="">Default routing</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="button button--secondary" onClick={() => loadWorkspace(activeChatId)}>
                  Refresh
                </button>
                {currentPage !== "groups" ? (
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setInfoPanelOpen((current) => !current)}
                    disabled={!activeChat || workspaceTab !== "chat"}
                  >
                    Info
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </header>

        {pageTabs.length ? (
          <nav className="workspace-tabs">
            {pageTabs.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={classNames("tab-button", workspaceTab === value && "is-active")}
                onClick={() => setWorkspaceTab(value)}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : null}

        <section className={classNames("workspace-body", showConversationAside && "has-aside")}>
          <div className="workspace-main">
            {currentPage === "ai" ? (
              <>
                <section className="stats-grid page-summary">
                  <article className="stat-card">
                    <span>Solo threads</span>
                    <strong>{soloChats.length}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Models</span>
                    <strong>{models.length || "Auto"}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Memory nodes</span>
                    <strong>{memoryGraph.nodes?.length || 0}</strong>
                  </article>
                </section>

                {workspaceTab === "chat" ? renderConversationChatPanel() : null}
                {workspaceTab === "memory" ? (
                  <MemoryGraphPanel graph={memoryGraph} onRefresh={handleRefreshMemory} api={api} />
                ) : null}
                {workspaceTab === "intelligence" ? (
                  <InsightsPanel
                    chatId={activeChatId}
                    chat={activeChat}
                    insights={insights}
                    loading={insightsLoading}
                    onGenerate={handleGenerateInsights}
                    onRefresh={handleRefreshInsights}
                  />
                ) : null}
                {workspaceTab === "transfer" ? (
                  <ImportExportPanel
                    chat={activeChat}
                    importForm={importForm}
                    onImportChange={(field, value) => setImportForm((current) => ({ ...current, [field]: value }))}
                    onImportSubmit={handleImportSubmit}
                    onExport={handleExport}
                    loading={transferLoading}
                  />
                ) : null}
              </>
            ) : null}

            {currentPage === "groups" ? (
              <>
                {workspaceTab === "chat" ? renderGroupsWorkspace() : null}
                {workspaceTab === "intelligence" ? (
                  <InsightsPanel
                    chatId={activeChatId}
                    chat={activeChat}
                    insights={insights}
                    loading={insightsLoading}
                    onGenerate={handleGenerateInsights}
                    onRefresh={handleRefreshInsights}
                  />
                ) : null}
              </>
            ) : null}

            {currentPage === "rooms" ? (
              <>
                <section className="stats-grid page-summary">
                  <article className="stat-card">
                    <span>Live rooms</span>
                    <strong>{roomChats.length}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Unread</span>
                    <strong>{roomsUnreadCount}</strong>
                  </article>
                  <article className="stat-card">
                    <span>Online users</span>
                    <strong>{onlineUsers.length}</strong>
                  </article>
                </section>

                {workspaceTab === "chat" ? renderConversationChatPanel() : null}
                {workspaceTab === "intelligence" ? (
                  <InsightsPanel
                    chatId={activeChatId}
                    chat={activeChat}
                    insights={insights}
                    loading={insightsLoading}
                    onGenerate={handleGenerateInsights}
                    onRefresh={handleRefreshInsights}
                  />
                ) : null}
              </>
            ) : null}

            {currentPage === "settings" ? renderSettingsWorkspace() : null}
          </div>

          {showConversationAside ? (
            <aside className="workspace-aside">
              <section className="card">
                <span className="eyebrow">Conversation info</span>
                <h3>{activeChat.name}</h3>
                <p>{activeChat.description || "No description provided."}</p>
                <div className="stack-list">
                  <div className="metric-row">
                    <span>Type</span>
                    <strong>{activeChat.type}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Members</span>
                    <strong>{activeChat.members?.length || 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Model</span>
                    <strong>{activeChat.aiModel || "Default routing"}</strong>
                  </div>
                </div>
              </section>

              <section className="card">
                <span className="eyebrow">Participants</span>
                <div className="stack-list">
                  {(activeChat.members || []).map((member) => (
                    <div key={member.id} className="participant-row">
                      <div>
                        <strong>{member.user?.name || member.user?.email || "Member"}</strong>
                        <span>{member.role}</span>
                      </div>
                      <small>
                        {presenceMap[member.userId]?.isOnline
                          ? "Online"
                          : formatRelativeLastSeen(presenceMap[member.userId]?.lastSeenAt)}
                      </small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <span className="eyebrow">Pinned</span>
                <div className="stack-list">
                  {pinnedMessages.length === 0 ? <p className="empty-copy">No pinned messages yet.</p> : null}
                  {pinnedMessages.map((message) => (
                    <div key={message.id} className="helper-box">
                      <strong>{message.senderName || message.senderEmail || "AI"}</strong>
                      <p>{message.content.slice(0, 180)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          ) : null}
        </section>

        <nav className="mobile-nav">
          {PRIMARY_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              className={classNames("mobile-nav__button", currentPage === page.id && "is-active")}
              onClick={() => navigateToPage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>

        {false ? (
          <>
        <section className={classNames("workspace-body", infoPanelOpen && "has-aside")}>
          <div className="workspace-main">
            {workspaceTab === "chat" ? (
              <section className="workspace-panel chat-panel">
                {!activeChat ? (
                  <div className="empty-state">
                    <span className="eyebrow">No active chat</span>
                    <h3>Create a solo AI thread or open a room from the sidebar.</h3>
                    <p>The backend sync, realtime events, moderation, memory, and model routing are all wired in.</p>
                    <div className="row-actions">
                      <button type="button" className="button button--primary" onClick={() => handleCreateSoloChat(true)}>
                        Start solo AI
                      </button>
                      <button type="button" className="button button--secondary" onClick={() => setSidebarOpen(true)}>
                        Browse chats
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-toolbar">
                      <div className="chat-toolbar__search">
                        <input
                          value={messageSearch}
                          onChange={(event) => setMessageSearch(event.target.value)}
                          placeholder="Search in messages"
                        />
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={handleAskAi}
                          disabled={activeChat.type === "DIRECT" || composerBusy}
                        >
                          Ask AI
                        </button>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() => handleGenerateInsights()}
                          disabled={!activeChatId}
                        >
                          Summarize
                        </button>
                      </div>
                    </div>

                    {pinnedMessages.length ? (
                      <div className="pinned-strip">
                        {pinnedMessages.map((message) => (
                          <button key={message.id} type="button" className="pinned-pill" onClick={() => setMessageSearch(message.content)}>
                            {message.content.slice(0, 80)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="message-list">
                      {visibleMessages.length === 0 ? <p className="empty-copy">No messages match the current filters.</p> : null}
                      {visibleMessages.map((message) => {
                        const isOwn = message.senderId === user.id && message.type !== "AI";
                        const metadata = parseJsonSafely(message.metadata);
                        return (
                          <article
                            key={message.id}
                            className={classNames(
                              "message-card",
                              isOwn && "is-own",
                              message.type === "AI" && "is-ai",
                              streamingIds.includes(message.id) && "is-streaming"
                            )}
                          >
                            <header className="message-card__header">
                              <div>
                                <strong>
                                  {message.type === "AI"
                                    ? "ChatSphere AI"
                                    : message.senderName || message.senderEmail || "Member"}
                                </strong>
                                <span>{formatTimestamp(message.createdAt)}</span>
                              </div>
                              <div className="message-card__status">
                                {message.modelUsed ? <span className="badge">{message.modelUsed}</span> : null}
                                {metadata?.provider ? <span className="badge">{metadata.provider}</span> : null}
                                {message.isPinned ? <span className="badge">Pinned</span> : null}
                              </div>
                            </header>

                            {message.parentMessageId ? <p className="reply-chip">Replying in thread</p> : null}

                            <MarkdownMessage message={message} onCopyCode={handleCopyCode} />

                            {message.poll ? (
                              <div className="poll-card">
                                <h4>{message.poll.question}</h4>
                                <div className="poll-options">
                                  {message.poll.options.map((option) => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      className={classNames(
                                        "poll-option",
                                        option.voters?.includes(user.id) && "is-selected"
                                      )}
                                      onClick={() => handleVotePoll(message.id, option.id)}
                                    >
                                      <span>{option.text}</span>
                                      <strong>{option.votes}</strong>
                                    </button>
                                  ))}
                                </div>
                                <small>
                                  {message.poll.allowMulti ? "Multi-select enabled" : "Single choice"}{" "}
                                  {message.poll.closesAt ? `• closes ${formatTimestamp(message.poll.closesAt)}` : ""}
                                </small>
                              </div>
                            ) : null}

                            <footer className="message-card__footer">
                              <div className="reaction-group">
                                {REACTION_OPTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="reaction-button"
                                    onClick={() => handleReactToMessage(message.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                {message.reactions?.length ? (
                                  <div className="reaction-summary">
                                    {message.reactions.map((reaction) => (
                                      <span key={reaction.id} className="badge">
                                        {reaction.emoji}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <div className="row-actions">
                                <button type="button" className="button button--ghost" onClick={() => setReplyTarget(message)}>
                                  Reply
                                </button>
                                <button
                                  type="button"
                                  className="button button--ghost"
                                  onClick={() => handlePinMessage(message, !message.isPinned)}
                                >
                                  {message.isPinned ? "Unpin" : "Pin"}
                                </button>
                                {message.senderId === user.id && message.type !== "AI" ? (
                                  <button type="button" className="button button--ghost" onClick={() => handleEditMessage(message)}>
                                    Edit
                                  </button>
                                ) : null}
                                <button type="button" className="button button--ghost" onClick={() => handleReportMessage(message.id)}>
                                  Report
                                </button>
                                {(message.senderId === user.id || activeChat.membership?.role === "ADMIN") && message.type !== "AI" ? (
                                  <button type="button" className="button button--danger" onClick={() => handleDeleteMessage(message.id)}>
                                    Delete
                                  </button>
                                ) : null}
                                {getMessageStatus(message, activeChat, user, presenceMap) ? (
                                  <span className="message-status">{getMessageStatus(message, activeChat, user, presenceMap)}</span>
                                ) : null}
                              </div>
                            </footer>
                          </article>
                        );
                      })}
                    </div>

                    {typingNames.length ? (
                      <p className="typing-indicator">{typingNames.join(", ")} typing...</p>
                    ) : null}

                    <div className="composer-shell">
                      {replyTarget ? (
                        <div className="reply-banner">
                          <div>
                            <strong>Replying to {replyTarget.senderName || replyTarget.senderEmail || "message"}</strong>
                            <p>{replyTarget.content.slice(0, 140)}</p>
                          </div>
                          <button type="button" className="button button--ghost" onClick={() => setReplyTarget(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : null}

                      {attachedFile ? (
                        <div className="attachment-banner">
                          <div>
                            <strong>{attachedFile.name}</strong>
                            <span>{Math.round(attachedFile.size / 1024)} KB</span>
                          </div>
                          <button type="button" className="button button--ghost" onClick={() => setAttachedFile(null)}>
                            Remove
                          </button>
                        </div>
                      ) : null}

                      <PollBuilder
                        enabled={pollState.enabled}
                        question={pollState.question}
                        options={pollState.options}
                        allowMulti={pollState.allowMulti}
                        closesAt={pollState.closesAt}
                        onToggle={(enabled) => setPollState((current) => ({ ...current, enabled }))}
                        onQuestionChange={(question) => setPollState((current) => ({ ...current, question }))}
                        onOptionChange={(index, value) =>
                          setPollState((current) => ({
                            ...current,
                            options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
                          }))
                        }
                        onAllowMultiChange={(allowMulti) => setPollState((current) => ({ ...current, allowMulti }))}
                        onClosesAtChange={(closesAt) => setPollState((current) => ({ ...current, closesAt }))}
                        onAddOption={() =>
                          setPollState((current) => ({
                            ...current,
                            options: [...current.options, ""],
                          }))
                        }
                        onRemoveOption={(index) =>
                          setPollState((current) => ({
                            ...current,
                            options: current.options.filter((_, optionIndex) => optionIndex !== index),
                          }))
                        }
                      />

                      <div className="composer-panel">
                        <textarea
                          ref={composerRef}
                          value={composerText}
                          onChange={(event) => handleTyping(event.target.value)}
                          placeholder={
                            activeChat.type === "SOLO"
                              ? "Ask anything, attach a file, or use /summarize"
                              : "Message the room, mention @ai, or use /ai for inline help"
                          }
                          rows={4}
                        />

                        <div className="composer-actions">
                          <div className="row-actions">
                            <label className="button button--ghost file-button">
                              Upload
                              <input
                                type="file"
                                hidden
                                onChange={(event) => setAttachedFile(event.target.files?.[0] || null)}
                              />
                            </label>
                            <button type="button" className="button button--ghost" onClick={handleVoiceInput}>
                              {voiceListening ? "Stop voice" : "Voice input"}
                            </button>
                            <button
                              type="button"
                              className={classNames("button button--ghost", pollState.enabled && "is-active")}
                              onClick={() => setPollState((current) => ({ ...current, enabled: !current.enabled }))}
                            >
                              Poll
                            </button>
                          </div>

                          <div className="row-actions">
                            <button
                              type="button"
                              className="button button--secondary"
                              onClick={handleAskAi}
                              disabled={activeChat.type === "DIRECT" || composerBusy}
                            >
                              Ask AI
                            </button>
                            <button type="button" className="button button--primary" onClick={() => handleSendMessage()} disabled={composerBusy}>
                              {composerBusy ? "Sending..." : "Send"}
                            </button>
                          </div>
                        </div>

                        <div className="composer-suggestions">
                          <div className="chip-row">
                            {QUICK_PROMPTS.map((prompt) => (
                              <button key={prompt} type="button" className="chip-button" onClick={() => setComposerText(prompt)}>
                                {prompt}
                              </button>
                            ))}
                          </div>
                          <div className="slash-list">
                            {SLASH_COMMANDS.map((item) => (
                              <span key={item.command}>
                                <code>{item.command}</code> {item.description}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {workspaceTab === "memory" ? (
              <MemoryGraphPanel graph={memoryGraph} onRefresh={handleRefreshMemory} api={api} />
            ) : null}

            {workspaceTab === "intelligence" ? (
              <InsightsPanel
                chatId={activeChatId}
                chat={activeChat}
                insights={insights}
                loading={insightsLoading}
                onGenerate={handleGenerateInsights}
                onRefresh={handleRefreshInsights}
              />
            ) : null}

            {workspaceTab === "transfer" ? (
              <ImportExportPanel
                chat={activeChat}
                importForm={importForm}
                onImportChange={(field, value) => setImportForm((current) => ({ ...current, [field]: value }))}
                onImportSubmit={handleImportSubmit}
                onExport={handleExport}
                loading={transferLoading}
              />
            ) : null}

            {workspaceTab === "admin" && showAdminTab ? (
              <AdminPanel
                analytics={analytics}
                flags={flags}
                prompts={prompts}
                blocks={blocks}
                promptForm={promptForm}
                onPromptFormChange={(field, value) => setPromptForm((current) => ({ ...current, [field]: value }))}
                onPromptSubmit={handlePromptSubmit}
                onPromptDelete={handlePromptDelete}
                onFlagStatusChange={handleFlagStatusChange}
                onBlockUser={handleBlockUser}
                loading={adminLoading}
              />
            ) : null}
          </div>

          {infoPanelOpen && activeChat ? (
            <aside className="workspace-aside">
              <section className="card">
                <span className="eyebrow">Conversation info</span>
                <h3>{activeChat.name}</h3>
                <p>{activeChat.description || "No description provided."}</p>
                <div className="stack-list">
                  <div className="metric-row">
                    <span>Type</span>
                    <strong>{activeChat.type}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Members</span>
                    <strong>{activeChat.members?.length || 0}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Model</span>
                    <strong>{activeChat.aiModel || "Default routing"}</strong>
                  </div>
                </div>
              </section>

              <section className="card">
                <span className="eyebrow">Participants</span>
                <div className="stack-list">
                  {(activeChat.members || []).map((member) => (
                    <div key={member.id} className="participant-row">
                      <div>
                        <strong>{member.user?.name || member.user?.email || "Member"}</strong>
                        <span>{member.role}</span>
                      </div>
                      <small>
                        {presenceMap[member.userId]?.isOnline
                          ? "Online"
                          : formatRelativeLastSeen(presenceMap[member.userId]?.lastSeenAt)}
                      </small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <span className="eyebrow">Pinned</span>
                <div className="stack-list">
                  {pinnedMessages.length === 0 ? <p className="empty-copy">No pinned messages yet.</p> : null}
                  {pinnedMessages.map((message) => (
                    <div key={message.id} className="helper-box">
                      <strong>{message.senderName || message.senderEmail || "AI"}</strong>
                      <p>{message.content.slice(0, 180)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          ) : null}
        </section>

        <nav className="mobile-nav">
          {[
            ["chat", "Chat"],
            ["memory", "Memory"],
            ["intelligence", "Insights"],
            ["transfer", "Transfer"],
            ...(showAdminTab ? [["admin", "Admin"]] : []),
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={classNames("mobile-nav__button", workspaceTab === value && "is-active")}
              onClick={() => setWorkspaceTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
          </>
        ) : null}
      </main>

      <div className="toast-stack">
        {toasts.map((toast) => (
          <article key={toast.id} className={classNames("toast", `toast--${toast.tone}`)}>
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </article>
        ))}
      </div>

      {workspaceLoading ? <div className="workspace-loading">Refreshing workspace...</div> : null}
    </div>
  );
}
