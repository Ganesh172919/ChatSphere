import api from './axios';

export interface DashboardStats {
  totalConversations: number;
  totalRooms: number;
  totalMessagesSent: number;
  messagesToday: number;
  onlineUsers: number;
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'ai_response';
  content: string;
  roomName: string | null;
  username: string;
  timestamp: string;
}

export interface RecentRoom {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  memberCount: number;
  currentUserRole: 'creator' | 'admin' | 'moderator' | 'member' | null;
}

export interface DashboardData {
  stats: DashboardStats;
  recentRooms: RecentRoom[];
  activity: ActivityItem[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
}
