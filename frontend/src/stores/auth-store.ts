import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthTokens } from '@/types'
import api from '@/lib/api-client'
import { socketClient } from '@/lib/socket-client'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          const { user, tokens } = data.data
          set({ user, isAuthenticated: true, isLoading: false })
          localStorage.setItem('auth_tokens', JSON.stringify(tokens))
          socketClient.connect()
        } catch (error: unknown) {
          set({ isLoading: false })
          const axiosError = error as { response?: { data?: { error?: { message?: string; code?: string } } } }
          const message = axiosError.response?.data?.error?.message || 'Login failed. Please check your credentials.'
          const err = new Error(message)
          ;(err as unknown as Record<string, unknown>).code = axiosError.response?.data?.error?.code
          throw err
        }
      },

      register: async (email: string, username: string, password: string, displayName?: string) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/register', { email, username, password, displayName })
          const { user, tokens } = data.data
          set({ user, isAuthenticated: true, isLoading: false })
          localStorage.setItem('auth_tokens', JSON.stringify(tokens))
          socketClient.connect()
        } catch (error: unknown) {
          set({ isLoading: false })
          const axiosError = error as { response?: { data?: { error?: { message?: string; code?: string } } } }
          const message = axiosError.response?.data?.error?.message || 'Registration failed. Please try again.'
          const err = new Error(message)
          ;(err as unknown as Record<string, unknown>).code = axiosError.response?.data?.error?.code
          throw err
        }
      },

      loginWithGoogle: async (idToken: string) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/google', { idToken })
          const { user, tokens } = data.data
          set({ user, isAuthenticated: true, isLoading: false })
          localStorage.setItem('auth_tokens', JSON.stringify(tokens))
          socketClient.connect()
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        const tokens = localStorage.getItem('auth_tokens')
        if (tokens) {
          const parsed: AuthTokens = JSON.parse(tokens)
          api.post('/auth/logout', { refreshToken: parsed.refreshToken }).catch(() => {})
        }
        localStorage.removeItem('auth_tokens')
        socketClient.disconnect()
        set({ user: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data.data, isAuthenticated: true })
        } catch {
          set({ user: null, isAuthenticated: false })
        }
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
