import type { User } from '@/domain'

/**
 * The single demo user the frontend operates as.
 *
 * There is NO authentication in the frontend. The Login page is pre-filled
 * with these credentials and simply navigates to the dashboard. Real
 * credential validation, sessions and authorization are backend concerns and
 * will be wired in when the API exists. Never treat anything derived from this
 * object as a security boundary.
 */
export const DEMO_USER: User = {
  id: 'user_demo',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  createdAt: '2025-01-15T09:00:00.000Z',
}

/** Shown pre-filled on the Login page. Not validated anywhere. */
export const DEMO_PASSWORD = 'demo-password'
