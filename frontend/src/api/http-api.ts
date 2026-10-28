import type { AccountType, FinanceSnapshot } from '@/domain'
import { MockFinanceApi } from './mock/mock-api'

type BackendAccount = { id: number; name: string; account_type: string; balance: string }
type BackendTxn = { id: number; account_id: number; amount: string; description: string; category: string; transaction_date: string }

// only loading accounts/transactions from the backend for now, rest is still mock
export class HttpFinanceApi extends MockFinanceApi {
  async loadSnapshot(): Promise<FinanceSnapshot> {
    const data = await super.loadSnapshot()
    try {
      const accounts: BackendAccount[] = await fetch('/api/accounts').then((r) => r.json())
      const txns: BackendTxn[] = await fetch('/api/transactions').then((r) => r.json())
      if (!accounts.length) return data

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
    } catch (err) {
      console.log('backend not running, using mock data', err)
    }
    return data
  }
}
