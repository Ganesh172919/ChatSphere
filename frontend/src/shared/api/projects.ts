import { apiClient } from "@/shared/api/client";
import type { ProjectDetail, ProjectSummary } from "@/shared/types/contracts";

export const listProjectsApi = () => apiClient.get<ProjectSummary[]>("/api/projects");
export const getProjectApi = (projectId: string) =>
  apiClient.get<ProjectDetail>(`/api/projects/${projectId}`);
export const createProjectApi = (payload: {
  name: string;
  description?: string;
  instructions?: string;
  context?: string;
  tags?: string[];
  suggestedPrompts?: string[];
}) => apiClient.post<ProjectDetail>("/api/projects", payload);
export const updateProjectApi = (
  projectId: string,
  payload: Partial<{
    name: string;
    description: string;
    instructions: string;
    context: string;
    tags: string[];
    suggestedPrompts: string[];
  }>
) => apiClient.patch<ProjectDetail>(`/api/projects/${projectId}`, payload);
export const deleteProjectApi = (projectId: string) =>
  apiClient.delete(`/api/projects/${projectId}`);
