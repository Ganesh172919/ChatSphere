import api from './axios';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  authProvider?: string;
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { username, email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}
