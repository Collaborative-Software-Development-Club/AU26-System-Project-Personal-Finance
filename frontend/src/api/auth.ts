export type User = { id: number; name: string; email: string; created_at: string }

// backend sends detail as a string for 401/409, but as a list for pydantic 422s
async function errorMessage(res: Response) {
  const body = await res.json().catch(() => null)
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) return body.detail[0]?.msg ?? 'Invalid input'
  return `Request failed (${res.status})`
}

async function post(path: string, body: object) {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json()
}

// no sessions yet, this just checks the email/password against the db
export const login = (email: string, password: string) => post('login', { email, password })

export const register = (name: string, email: string, password: string): Promise<User> =>
  post('register', { name, email, password })
