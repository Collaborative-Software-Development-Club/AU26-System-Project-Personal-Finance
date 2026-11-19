export function getPostLoginPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return '/dashboard'
  const path = state.from
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return '/dashboard'
  const pathname = path.split(/[?#]/, 1)[0]
  if (pathname === '/login' || pathname === '/register' || path.includes('\\')) return '/dashboard'
  return path
}
