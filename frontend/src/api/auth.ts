import { ApiError } from './errors'
import type { User } from '@/domain'

export interface LoginInput {
  email: string
  password: string
}

export async function loginRequest(
  input: LoginInput,
): Promise<void> {
  let response: Response

  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw new ApiError(
      'unknown_outcome',
      'The login request could not be confirmed. Check your connection.',
    )
  }

  if (response.status === 401) {
    throw new ApiError(
      'unauthenticated',
      'Invalid email or password.',
    )
  }

  if (response.status === 422) {
    throw new ApiError(
      'validation',
      'Check the email and password you entered.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      'unavailable',
      'Sign-in is currently unavailable.',
    )
  }
}

export async function getCurrentUserRequest(): Promise<User | null> {
  let response: Response

  try {
    response = await fetch('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(
      'unavailable',
      'Unable to check your session. Check your connection.',
    )
  }

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new ApiError(
      'unavailable',
      'Unable to check your session.',
    )
  }

  let data: unknown

  try {
    data = await response.json()
  } catch {
    throw new ApiError(
      'unavailable',
      'The server returned an invalid user response.',
    )
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) ||
    typeof data.id !== 'number' ||
    !('name' in data) ||
    typeof data.name !== 'string' ||
    !('email' in data) ||
    typeof data.email !== 'string' ||
    !('created_at' in data) ||
    typeof data.created_at !== 'string'
  ) {
    throw new ApiError(
      'unavailable',
      'The server returned an invalid user response.',
    )
  }

  return {
    id: String(data.id),
    name: data.name,
    email: data.email,
    createdAt: data.created_at,
  }
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export async function registerRequest(
  input: RegisterInput,
): Promise<void> {
  let response: Response

  try {
    response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
      }),
    })
  } catch {
    throw new ApiError(
      'unknown_outcome',
      'The registration request could not be confirmed. Check your connection.',
    )
  }

  if (response.status === 409) {
    throw new ApiError(
      'conflict',
      'This email is already registered.',
    )
  }

  if (response.status === 422) {
    throw new ApiError(
      'validation',
      'Check your name, email, and password requirements.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      'unavailable',
      'Registration is currently unavailable.',
    )
  }
}

export async function logoutRequest(): Promise<void> {
  let response: Response

  try {
    response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    throw new ApiError(
      'unknown_outcome',
      'The logout request could not be confirmed. Check your connection.',
    )
  }

  if (!response.ok) {
    throw new ApiError(
      'unavailable',
      'Logout could not be completed.',
    )
  }
}