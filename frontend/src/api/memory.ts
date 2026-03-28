import api from './axios';

export interface MemoryEntry {
  id: string;
  summary: string;
  details: string;
  tags: string[];
  pinned: boolean;
  confidenceScore: number;
  importanceScore: number;
  recencyScore: number;
  sourceType: string;
  sourceConversationId: string | null;
  sourceRoomId: string | null;
  updatedAt: string;
  usageCount: number;
}

export interface ImportPreview {
  sourceType: string;
  conversations: Array<{
    title: string;
    messageCount: number;
    preview: Array<{ role: string; content: string; timestamp: string }>;
  }>;
  candidateMemories: Array<{
    summary: string;
    details: string;
    tags: string[];
    confidenceScore: number;
    importanceScore: number;
  }>;
  errors: string[];
}

export interface ImportResult {
  reused: boolean;
  importSessionId: string;
  importedConversationIds: string[];
  importedMemoryIds: string[];
}

export async function fetchMemoryEntries(query = ''): Promise<MemoryEntry[]> {
  const { data } = await api.get<MemoryEntry[]>('/memory', {
    params: query ? { q: query } : undefined,
  });
  return data;
}

export async function updateMemoryEntry(
  id: string,
  payload: Partial<Pick<MemoryEntry, 'summary' | 'details' | 'tags' | 'pinned' | 'confidenceScore' | 'importanceScore'>>
): Promise<MemoryEntry> {
  const { data } = await api.put<MemoryEntry>(`/memory/${id}`, payload);
  return data;
}

export async function deleteMemoryEntry(id: string): Promise<void> {
  await api.delete(`/memory/${id}`);
}

export async function previewMemoryImport(content: string, filename: string): Promise<ImportPreview> {
  const { data } = await api.post<ImportPreview>('/memory/import', {
    mode: 'preview',
    content,
    filename,
  });
  return data;
}

export async function importMemoryBundle(content: string, filename: string): Promise<ImportResult> {
  const { data } = await api.post<ImportResult>('/memory/import', {
    mode: 'import',
    content,
    filename,
  });
  return data;
}

export async function exportMemoryBundle(format: 'normalized' | 'markdown' | 'adapter'): Promise<Blob> {
  const { data } = await api.get('/memory/export', {
    params: { format },
    responseType: 'blob',
  });
  return data;
}
