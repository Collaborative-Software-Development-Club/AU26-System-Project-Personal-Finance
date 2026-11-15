import type { AccountType, FinanceSnapshot } from '@/domain'
import { MockFinanceApi } from './mock/mock-api'
import { ApiError } from './errors'
import { AUTH_SESSION_EXPIRED_EVENT } from './session-events'

type BackendAccount = { id: number; name: string; account_type: string; balance: string }
type BackendTxn = { id: number; account_id: number; amount: string; description: string; category: string; transaction_date: string }

// only loading accounts/transactions from the backend for now, rest is still mock
export class HttpFinanceApi extends MockFinanceApi {
  private scopeVersion = 0

  override setUserScope(userId: string | null): void {
    ++this.scopeVersion
    super.setUserScope(userId)
  }

  private async readBackend<T>(path: string, scopeVersion: number): Promise<T[]> {
    let response: Response
    try {
      response = await fetch(path, { credentials: 'include', cache: 'no-store' })
    } catch {
      throw new ApiError('unavailable', 'Unable to load your financial data. Check your connection.')
    }
    if (response.status === 401) {
      if (scopeVersion === this.scopeVersion && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
      throw new ApiError('unauthenticated', 'Your session expired. Please sign in again.')
    }
    if (!response.ok) throw new ApiError('unavailable', 'Unable to load your financial data.')
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new ApiError('unavailable', 'The server returned invalid financial data.')
    return data as T[]
  }

  async loadSnapshot(): Promise<FinanceSnapshot> {
    const scopeVersion = this.scopeVersion
    const data = await super.loadSnapshot()
    const [accounts, txns] = await Promise.all([
      this.readBackend<BackendAccount>('/api/accounts', scopeVersion),
      this.readBackend<BackendTxn>('/api/transactions', scopeVersion),
    ])
    const cents = (n: string) => Math.round(Number(n) * 100)
    const now = new Date().toISOString()

    data.transactions = txns.map((t) => ({
      id: String(t.id),
      description: t.description,
      type: cents(t.amount) < 0 ? 'expense' : 'income',
      amount: Math.abs(cents(t.amount)),
      currency: 'USD',
      accountId: String(t.account_id),
      categoryId: data.categories.find((c) => c.name.toLowerCase() === t.category.toLowerCase())?.id ?? null,
      date: t.transaction_date,
      notes: null,
      source: 'manual',
      status: 'posted',
      transferId: null,
      transferDirection: null,
      recurringRuleId: null,
      importId: null,
      createdAt: now,
    }))
    data.accounts = accounts.map((a) => ({
      id: String(a.id),
      name: a.name,
      type: (a.account_type.toLowerCase() as AccountType) || 'other',
      currency: 'USD',
      // backend has the current balance, frontend wants the starting one
      openingBalance:
        cents(a.balance) - txns.filter((t) => t.account_id === a.id).reduce((s, t) => s + cents(t.amount), 0),
      status: 'active',
      description: null,
      color: null,
      createdAt: now,
    }))
    data.transfers = []
    data.recurringRules = []
    data.budgets = []
    return data
  }
}
