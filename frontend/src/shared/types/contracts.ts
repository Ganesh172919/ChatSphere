export type ThemeMode = "light" | "dark" | "system";

export interface UserSettings {
  theme: ThemeMode;
  accentColor: string;
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
  };
  aiFeatures: {
    smartReplies: boolean;
    sentiment: boolean;
    grammar: boolean;
  };
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  displayName: string | null;
  bio: string | null;
  authProvider: "LOCAL" | "GOOGLE";
  onlineStatus: boolean;
  lastSeen: string;
  settings: UserSettings;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
  retryAfterMs?: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiFailureEnvelope {
  success: false;
  error: ApiErrorPayload;
}

export interface AttachmentMeta {
  fileUrl?: string;
  fileName?: string;
  originalName?: string;
  fileType?: string;
  fileSize?: number;
  textContent?: string;
  base64?: string;
}

export interface Insight {
  id?: string;
  title?: string;
  summary?: string;
  intent?: string | null;
  topics?: string[];
  decisions?: string[];
  actionItems?: string[];
  messageCount?: number;
  lastGeneratedAt?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  memoryRefs?: string[];
  file?: AttachmentMeta;
  modelTelemetry?: Record<string, unknown>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
  } | null;
  messageCount: number;
  lastMessage: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  importMetadata?: unknown;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiModelDefinition {
  id: string;
  provider: string;
  label: string;
  supportsImages?: boolean;
  supportsJson?: boolean;
}

export interface AiModelCatalog {
  auto: {
    id: string;
    label: string;
    provider: string;
  };
  models: AiModelDefinition[];
}

export interface ChatRunTelemetry {
  provider: string;
  selectedModel: string;
  fallbackUsed: boolean;
  complexity: string;
  processingMs: number;
  category: string;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SoloChatResult {
  conversationId: string;
  content: string;
  memoryRefs: string[];
  insight?: Insight | null;
  model: {
    provider: string;
    id: string;
    label: string;
  };
  usage: ChatUsage;
  telemetry: ChatRunTelemetry;
}

export interface RoomSummary {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  maxUsers: number;
  role: "ADMIN" | "MODERATOR" | "MEMBER";
  memberCount: number;
  messageCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  onlineStatus?: boolean;
  lastSeen?: string;
}

export interface RoomMember {
  userId: string;
  role: "ADMIN" | "MODERATOR" | "MEMBER";
  joinedAt: string;
  user: RoomUser;
  canManage?: boolean;
}

export interface RoomReplyRef {
  messageId: string;
  snippet?: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  isAI: boolean;
  triggeredBy?: string | null;
  replyTo?: RoomReplyRef | null;
  reactions?: Record<string, string[]>;
  status: "SENT" | "DELIVERED" | "READ";
  readBy?: string[];
  isPinned: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  memoryRefs?: string[];
  modelId?: string | null;
  modelProvider?: string | null;
  modelTelemetry?: Record<string, unknown> | null;
  senderRole?: "ADMIN" | "MODERATOR" | "MEMBER";
  createdAt: string;
  updatedAt: string;
}

export interface RoomDetail {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  maxUsers: number;
  creatorId: string;
  aiHistory?: unknown[];
  members: RoomMember[];
  messages: RoomMessage[];
  insight?: Insight | null;
}

export interface RoomMessagePage {
  total: number;
  messages: RoomMessage[];
}

export interface PollOption {
  id: string;
  label: string;
  votes?: string[];
  voteCount: number;
  percentage: number;
  hasVoted: boolean;
}

export interface Poll {
  id: string;
  roomId: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  allowMultipleVotes: boolean;
  anonymous: boolean;
  closed: boolean;
  expiresAt?: string | null;
  totalVotes: number;
  hasVoted: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  suggestedPrompts: string[];
  conversationCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectFile {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  note?: string;
  addedAt?: string;
}

export interface ProjectDetail {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  context?: string | null;
  tags: string[];
  suggestedPrompts: string[];
  files: ProjectFile[];
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  fingerprint: string;
  summary: string;
  details?: string | null;
  tags: string[];
  confidence: number;
  importance: number;
  recency: number;
  pinned: boolean;
  usageCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceUpdate {
  userId: string;
  onlineStatus: boolean;
  lastSeen: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  username?: string;
}

export interface MessagesReadPayload {
  roomId: string;
  userId: string;
  messageIds: string[];
}

export type SocketErrorPayload = ApiErrorPayload;
