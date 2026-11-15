import { create } from 'zustand'
import {
  ApiError,
  describeError,
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  setFinanceUserScope,
  type LoginInput,
  type RegisterInput,
} from '@/api'
import type { User } from '@/domain'
import { useFinanceStore } from './finance-store'

type AuthStatus = 'idle' | 'loading' | 'ready' | 'error'
type AuthOperation = 'login' | 'register' | 'logout'

interface AuthState {
  user: User | null
  status: AuthStatus
  initialized: boolean
  pending: AuthOperation | null
  error: string | null
  restoreSession(): Promise<void>
  login(input: LoginInput): Promise<void>
  register(input: RegisterInput): Promise<void>
  logout(): Promise<void>
  invalidateSession(): void
}

export const useAuthStore = create<AuthState>()((set, get) => {
  let restoration: Promise<void> | null = null
  let revision = 0

  const applyUser = (user: User | null) => {
    if (get().user?.id !== user?.id || !get().initialized) {
      setFinanceUserScope(user?.id ?? null)
      useFinanceStore.getState().clear()
    }
    set({ user })
  }

  const begin = (pending: AuthOperation) => {
    if (get().pending || restoration) {
      throw new ApiError('conflict', 'Another authentication request is in progress.')
    }
    const current = ++revision
    set({ pending, error: null })
    return current
  }

  const ensureCurrent = (current: number) => {
    if (current !== revision) {
      throw new ApiError('unauthenticated', 'Your session changed. Please sign in again.')
    }
  }

  return {
    user: null,
    status: 'idle',
    initialized: false,
    pending: null,
    error: null,

    restoreSession: () => {
      if (restoration) return restoration
      if (get().pending) return Promise.resolve()
      const current = revision
      set({ status: 'loading', error: null })
      restoration = (async () => {
        try {
          const user = await getCurrentUserRequest()
          if (current !== revision) return
          applyUser(user)
          set({ status: 'ready', initialized: true, error: null })
        } catch (error) {
          if (current === revision) {
            set({ status: 'error', error: describeError(error) })
          }
          throw error
        } finally {
          restoration = null
        }
      })()
      return restoration
    },

    login: async (input) => {
      const current = begin('login')
      applyUser(null)
      try {
        await loginRequest(input)
        ensureCurrent(current)
        const user = await getCurrentUserRequest()
        ensureCurrent(current)
        if (!user) {
          throw new ApiError('unauthenticated', 'Your session could not be confirmed. Please sign in again.')
        }
        applyUser(user)
        set({ status: 'ready', initialized: true, pending: null, error: null })
      } catch (error) {
        if (current === revision) {
          set({ status: 'ready', initialized: true, pending: null, error: describeError(error) })
        }
        throw error
      }
    },

    register: async (input) => {
      const current = begin('register')
      try {
        await registerRequest(input)
        ensureCurrent(current)
        set({ pending: null, error: null })
      } catch (error) {
        if (current === revision) set({ pending: null, error: describeError(error) })
        throw error
      }
    },

    logout: async () => {
      const current = begin('logout')
      try {
        await logoutRequest()
        ensureCurrent(current)
        applyUser(null)
        set({ status: 'ready', initialized: true, pending: null, error: null })
      } catch (error) {
        if (current === revision) set({ pending: null, error: describeError(error) })
        throw error
      }
    },

    invalidateSession: () => {
      ++revision
      applyUser(null)
      set({
        status: 'ready',
        initialized: true,
        pending: null,
        error: 'Your session expired. Please sign in again.',
      })
    },
  }
})
