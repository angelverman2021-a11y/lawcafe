import { create } from 'zustand'
import { api, setAccessToken, clearAccessToken } from './api'

export type Role = 'USER' | 'LAWYER' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login:    (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role?: Role) => Promise<void>
  logout:   () => Promise<void>
  hydrate:  () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    set({ user: data.user })
  },

  register: async (name, email, password, role = 'USER') => {
    const { data } = await api.post('/auth/register', { name, email, password, role })
    setAccessToken(data.accessToken)
    set({ user: data.user })
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {})
    clearAccessToken()
    set({ user: null })
  },

  // Called once on app mount — tries a silent refresh to restore session
  hydrate: async () => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/refresh', {})
      setAccessToken(data.accessToken)
      set({ user: data.user, loading: false })
    } catch {
      clearAccessToken()
      set({ user: null, loading: false })
    }
  }
}))
