export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isAdmin: boolean;
  presenceStatus: 'ONLINE' | 'AWAY' | 'OFFLINE';
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  accentColor: string | null;
  notifications: boolean;
  aiFeatures: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: 'PRIVATE' | 'INTERNAL' | 'PUBLIC';
  tags: string[];
  maxMembers: number | null;
  creatorId: string;
  lastMessageAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members?: RoomMember[];
  messages?: Message[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  mutedUntil: string | null;
  user: User;
}

export interface Message {
  id: string;
  roomId: string;
  authorId: string | null;
  authorName: string;
  parentMessageId: string | null;
  uploadId: string | null;
  content: string;
  messageType: 'USER' | 'SYSTEM' | 'AI';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'DELETED';
  isPinned: boolean;
  pinnedAt: string | null;
  pinnedById: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  triggeredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  author?: User;
  reactions?: MessageReaction[];
  readReceipts?: MessageRead[];
  replies?: Message[];
  upload?: Upload;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: 'THUMBS_UP' | 'FIRE' | 'MIND_BLOWN' | 'IDEA';
  createdAt: string;
  user?: User;
}

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
  user?: User;
}

export interface Upload {
  id: string;
  ownerId: string;
  roomId: string | null;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'PRIVATE' | 'ROOM';
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  roomId: string | null;
  title: string;
  entries: { role: string; content: string; timestamp: string }[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  projectId: string | null;
  roomId: string | null;
  summary: string;
  content: string;
  keywords: string[];
  score: number;
  source: 'CHAT' | 'ROOM' | 'USER_PROFILE' | 'SYSTEM';
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface UserSettings {
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  customTheme: Record<string, string> | null;
  accentColor: string | null;
  notifications: boolean;
  aiFeatures: boolean;
}

export interface RoomCreateInput {
  name: string;
  description?: string;
  visibility?: 'PRIVATE' | 'INTERNAL' | 'PUBLIC';
  tags?: string[];
  maxMembers?: number;
}

export interface MessageCreateInput {
  content: string;
  replyToId?: string;
  uploadId?: string;
}

export interface AIChatInput {
  prompt: string;
  context?: string;
  roomId?: string;
  conversationId?: string;
  model?: string;
}

export interface SmartReplyInput {
  prompt: string;
  roomId: string;
}

export interface InsightInput {
  text: string;
  roomId: string;
}

export interface MemoryCreateInput {
  summary: string;
  content: string;
  keywords: string[];
  score?: number;
  roomId?: string;
  projectId?: string;
}

export interface MemoryExtractInput {
  content: string;
  roomId: string;
}
