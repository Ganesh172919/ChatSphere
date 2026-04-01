import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from 'axios'
import type { ApiResponse, AuthTokens } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  private client: AxiosInstance
  private refreshTokenPromise: Promise<string> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const tokens = this.getTokens()
        if (tokens?.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const newAccessToken = await this.refreshAccessToken()
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
            }
            return this.client(originalRequest)
          } catch {
            this.clearTokens()
            window.location.href = '/login'
            return Promise.reject(error)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise
    }

    this.refreshTokenPromise = (async () => {
      const tokens = this.getTokens()
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token')
      }

      const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
        `${API_URL}/auth/refresh`,
        { refreshToken: tokens.refreshToken }
      )

      const newTokens = response.data.data
      this.setTokens(newTokens)
      this.refreshTokenPromise = null
      return newTokens.accessToken
    })()

    return this.refreshTokenPromise
  }

  getTokens(): AuthTokens | null {
    try {
      const stored = localStorage.getItem('auth_tokens')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  setTokens(tokens: AuthTokens) {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
  }

  clearTokens() {
    localStorage.removeItem('auth_tokens')
    this.refreshTokenPromise = null
  }

  getInstance(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient()
export default apiClient.getInstance()
