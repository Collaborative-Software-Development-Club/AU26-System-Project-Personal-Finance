/**
 * localStorage persistence for the mock database.
 *
 * The payload is versioned. Anything that fails to parse, has the wrong
 * version, or fails a basic shape check is discarded and the sample dataset is
 * re-seeded. localStorage is NOT secure storage; nothing sensitive lives here.
 */
import type { FinanceSnapshot } from '@/domain'

export const MOCK_DB_STORAGE_KEY = 'pf.mock-db'
export const MOCK_DB_VERSION = 1

interface StoredPayload {
  version: number
  savedAt: string
  snapshot: FinanceSnapshot
}

const REQUIRED_KEYS: (keyof FinanceSnapshot)[] = [
  'accounts',
  'categories',
  'transactions',
  'budgets',
  'recurringRules',
  'transfers',
  'importJobs',
]

function looksLikeSnapshot(value: unknown): value is FinanceSnapshot {
  if (!value || typeof value !== 'object') return false
  return REQUIRED_KEYS.every((k) => Array.isArray((value as Record<string, unknown>)[k]))
}

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function readSnapshot(): FinanceSnapshot | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(MOCK_DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPayload>
    if (parsed.version !== MOCK_DB_VERSION || !looksLikeSnapshot(parsed.snapshot)) return null
    return parsed.snapshot
  } catch {
    return null
  }
}

export function writeSnapshot(snapshot: FinanceSnapshot): void {
  const storage = getStorage()
  if (!storage) return
  const payload: StoredPayload = { version: MOCK_DB_VERSION, savedAt: new Date().toISOString(), snapshot }
  try {
    storage.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded or storage disabled — the in-memory copy keeps working.
  }
}

export function clearSnapshot(): void {
  getStorage()?.removeItem(MOCK_DB_STORAGE_KEY)
}
