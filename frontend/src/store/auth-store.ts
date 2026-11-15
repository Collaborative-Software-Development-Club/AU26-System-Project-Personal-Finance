import { create } from 'zustand'

import {
  ApiError,
  describeError,
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginInput,
  type RegisterInput,
} from '@/api'
import type { User } from '@/domain'



type AuthStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthState {
    user: User | null
    status: AuthStatus
    error: string | null
    restoreSession(): Promise<void>
    login(input: LoginInput): Promise<void>
    register(input: RegisterInput): Promise<void>
    logout(): Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',
  error: null,

  restoreSession: async () => {
    if (get().status === 'loading') {
      return
    }

    set({
      status: 'loading',
      error: null,
    })

    try {
      const user = await getCurrentUserRequest()

      set({
        user,
        status: 'ready',
        error: null,
      })
    } catch (error) {
      set({
        status: 'error',
        error: describeError(error),
      })

      throw error
    }
  },

    login: async (input) => {
    if (get().status === 'loading') {
      throw new ApiError(
        'conflict',
        'Another authentication request is in progress.',
      )
    }

    set({
      user: null,
      status: 'loading',
      error: null,
    })

    try {
      await loginRequest(input)

      const user = await getCurrentUserRequest()

      if (user === null) {
        throw new ApiError(
          'unauthenticated',
          'Your session could not be confirmed. Please sign in again.',
        )
      }

      set({
        user,
        status: 'ready',
        error: null,
      })
    } catch (error) {
      set({
        status: 'error',
        error: describeError(error),
      })

      throw error
    }
  },

  register: async (input) => {
    if (get().status === 'loading') {
      throw new ApiError(
        'conflict',
        'Another authentication request is in progress.',
      )
    }

    await registerRequest(input)
  },

  logout: async () => {
    if (get().status === 'loading') {
      throw new ApiError(
        'conflict',
        'Another authentication request is in progress.',
      )
    }

    set({
      status: 'loading',
      error: null,
    })

    try {
      await logoutRequest()

      set({
        user: null,
        status: 'ready',
        error: null,
      })
    } catch (error) {
      set({
        status: 'error',
        error: describeError(error),
      })

      throw error
    }
  },
}))
