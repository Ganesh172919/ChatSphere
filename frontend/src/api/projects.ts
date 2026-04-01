import api from './axios';

export interface ProjectFile {
  id?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  note?: string;
  addedAt?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  instructions: string;
  context: string;
  tags: string[];
  suggestedPrompts: string[];
  files: ProjectFile[];
  conversationCount: number;
  lastConversationAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  recentConversations: Array<{
    id: string;
    title: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ProjectPayload {
  name: string;
  description: string;
  instructions: string;
  context: string;
  tags: string[];
  suggestedPrompts: string[];
  files: ProjectFile[];
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const { data } = await api.get<ProjectSummary[]>('/projects');
  return data;
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const { data } = await api.get<ProjectDetail>(`/projects/${id}`);
  return data;
}

export async function createProject(payload: ProjectPayload): Promise<ProjectSummary> {
  const { data } = await api.post<ProjectSummary>('/projects', payload);
  return data;
}

export async function updateProject(id: string, payload: ProjectPayload): Promise<ProjectSummary> {
  const { data } = await api.patch<ProjectSummary>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}
