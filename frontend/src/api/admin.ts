import api from './axios';

export interface AdminStats {
  totalUsers: number;
  totalRooms: number;
  totalMessages: number;
  pendingReports: number;
  onlineUsers: number;
  recentUsers: Array<{
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    createdAt: string;
  }>;
}

export interface AdminReport {
  id: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  targetType: 'user' | 'message';
  targetId: string;
  roomId: string | null;
  reason: string;
  description: string;
  status: string;
  reviewNote: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  onlineStatus: string;
  isAdmin: boolean;
  createdAt: string;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/admin/stats');
  return data;
}

export async function fetchReports(
  page = 1,
  status = 'pending'
): Promise<{ reports: AdminReport[]; total: number; page: number; totalPages: number }> {
  const { data } = await api.get('/admin/reports', { params: { page, status } });
  return data;
}

export async function resolveReport(
  id: string,
  status: 'reviewed' | 'action_taken' | 'dismissed',
  reviewNote?: string
): Promise<{ id: string; status: string; message: string }> {
  const { data } = await api.put(`/admin/reports/${id}`, { status, reviewNote });
  return data;
}

export async function fetchAdminUsers(
  page = 1,
  search = ''
): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  const { data } = await api.get('/admin/users', { params: { page, q: search } });
  return data;
}
