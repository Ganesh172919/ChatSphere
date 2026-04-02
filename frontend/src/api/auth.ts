import api from './axios';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  authProvider?: string;
  onlineStatus?: string;
  lastSeen?: string | null;
  isAdmin?: boolean;
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { username, email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function refreshAccessToken(): Promise<{ accessToken: string }> {
  const { data } = await api.post('/auth/refresh');
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/reset-password', { email, token, newPassword });
  return data;
}

export async function exchangeGoogleCode(code: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google/exchange', { code });
  return data;
}
