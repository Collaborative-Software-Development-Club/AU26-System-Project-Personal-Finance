import type { Account, AccountType, Category, FinanceSnapshot, Id, ImportJob, ImportJobStatus, Transaction } from '@/domain'
import { MockFinanceApi } from './mock/mock-api'
import { ApiError, OutcomeUnknownError } from './errors'
import { AUTH_SESSION_EXPIRED_EVENT } from './session-events'
import type { AccountInput, ImportInput, ImportResult } from './types'

type BackendAccount = { id: number; name: string; account_type: string; balance: string }
type BackendTxn = { id: number; account_id: number; amount: string; description: string; category: string; transaction_date: string }
type BackendUploadResult = {
  id?: number
  status?: string
  message?: string
  filename?: string
  total_rows?: number
  imported_rows?: number
  failed_rows?: number
  duplicate_rows?: number
  errors?: { row: number; field: string | null; message: string }[]
  detail?: unknown
}

// only loading accounts/transactions from the backend for now, rest is still mock
export class HttpFinanceApi extends MockFinanceApi {
  private scopeVersion = 0
  private lastCategories: Category[] = []

  override setUserScope(userId: string | null): void {
    ++this.scopeVersion
    super.setUserScope(userId)
    this.lastCategories = []
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
    this.lastCategories = data.categories
    const now = new Date().toISOString()

    data.transactions = txns.map((t) => this.mapBackendTxn(t, now))
    data.accounts = accounts.map((a) => ({
      id: String(a.id),
      name: a.name,
      type: (a.account_type.toLowerCase() as AccountType) || 'other',
      currency: 'USD',
      // backend has the current balance, frontend wants the starting one
      openingBalance:
        toCents(a.balance) - txns.filter((t) => t.account_id === a.id).reduce((s, t) => s + toCents(t.amount), 0),
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

  override async createAccount(input: AccountInput): Promise<Account> {
    const scopeVersion = this.scopeVersion
    let response: Response
    try {
      response = await fetch('/api/accounts', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name.trim(),
          account_type: input.type,
          balance: (input.openingBalance / 100).toFixed(2),
        }),
      })
    } catch {
      throw new ApiError('unavailable', 'Unable to create the account. Check your connection.')
    }
    if (response.status === 401) {
      if (scopeVersion === this.scopeVersion && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
      throw new ApiError('unauthenticated', 'Your session expired. Please sign in again.')
    }
    if (response.status === 422) {
      throw new ApiError('validation', 'Check the account details you entered.')
    }
    if (!response.ok) throw new ApiError('unavailable', 'Unable to create the account.')
    const created = (await response.json()) as BackendAccount
    const now = new Date().toISOString()
    return {
      id: String(created.id),
      name: created.name,
      type: (created.account_type.toLowerCase() as AccountType) || input.type,
      currency: input.currency,
      openingBalance: Math.round(Number(created.balance) * 100),
      status: 'active',
      description: input.description?.trim() || null,
      color: input.color,
      createdAt: now,
    }
  }

  override async deleteAccount(id: Id): Promise<void> {
    const scopeVersion = this.scopeVersion
    let response: Response
    try {
      response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      })
    } catch {
      throw new ApiError('unavailable', 'Unable to delete the account. Check your connection.')
    }
    if (response.status === 401) {
      if (scopeVersion === this.scopeVersion && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
      throw new ApiError('unauthenticated', 'Your session expired. Please sign in again.')
    }
    if (response.status === 404) throw new ApiError('not_found', 'Account not found.')
    if (response.status === 409) {
      throw new ApiError('conflict', 'This account has transactions. Delete those first, or archive the account.')
    }
    if (!response.ok && response.status !== 204) {
      throw new ApiError('unavailable', 'Unable to delete the account.')
    }
  }

  override async runImport(input: ImportInput, idempotencyKey: string): Promise<ImportResult> {
    const scopeVersion = this.scopeVersion
    const payload = {
      upload_id: idempotencyKey,
      chunk_index: 0,
      filename: input.fileName,
      rows: input.rows.map((row) => {
        const accountId = Number(row.accountId)
        if (!Number.isInteger(accountId) || accountId <= 0) {
          throw new ApiError('validation', `Row ${row.row} is missing a valid account.`)
        }
        const signedCents = row.type === 'expense' ? -row.amount : row.amount
        return {
          date: row.date,
          amount: (signedCents / 100).toFixed(2),
          description: row.description,
          category: this.lastCategories.find((c) => c.id === row.categoryId)?.name ?? '',
          account_id: accountId,
        }
      }),
    }

    let response: Response
    try {
      response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new OutcomeUnknownError(idempotencyKey, 'The import was sent, but no confirmation came back.')
    }

    if (response.status === 401) {
      if (scopeVersion === this.scopeVersion && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
      }
      throw new ApiError('unauthenticated', 'Your session expired. Please sign in again.')
    }

    let body: BackendUploadResult
    try {
      body = (await response.json()) as BackendUploadResult
    } catch {
      throw new OutcomeUnknownError(idempotencyKey, 'The import was sent, but no confirmation came back.')
    }

    if (!response.ok) {
      throw new ApiError('unavailable', uploadErrorMessage(body, 'Unable to import the file.'))
    }

    const now = new Date().toISOString()
    const job: ImportJob = {
      id: String(body.id ?? idempotencyKey),
      fileName: body.filename ?? input.fileName,
      createdAt: now,
      accountId: input.accountId,
      totalRows: body.total_rows ?? input.rows.length + input.invalidRows.length + input.skippedRows,
      successfulRows: body.imported_rows ?? 0,
      failedRows: (body.failed_rows ?? 0) + input.invalidRows.length,
      skippedRows: (body.duplicate_rows ?? 0) + input.skippedRows,
      status: toImportJobStatus(body.status),
      errors: [
        ...input.invalidRows,
        ...(body.errors ?? []).map((error) => ({
          row: error.row,
          field: error.field,
          message: error.message,
        })),
      ],
    }

    let transactions: Transaction[] = []
    try {
      const txns = await this.readBackend<BackendTxn>('/api/transactions', scopeVersion)
      transactions = txns.map((t) => this.mapBackendTxn(t, now))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'unauthenticated') throw error
    }

    return { job, transactions }
  }

  private mapBackendTxn(t: BackendTxn, createdAt: string): Transaction {
    const cents = toCents(t.amount)
    const category = (t.category ?? '').toLowerCase()
    return {
      id: String(t.id),
      description: t.description,
      type: cents < 0 ? 'expense' : 'income',
      amount: Math.abs(cents),
      currency: 'USD',
      accountId: String(t.account_id),
      categoryId: this.lastCategories.find((c) => c.name.toLowerCase() === category)?.id ?? null,
      date: t.transaction_date,
      notes: null,
      source: 'manual',
      status: 'posted',
      transferId: null,
      transferDirection: null,
      recurringRuleId: null,
      importId: null,
      createdAt,
    }
  }
}

function toCents(value: string): number {
  return Math.round(Number(value) * 100)
}

function toImportJobStatus(status: string | undefined): ImportJobStatus {
  if (status === 'partial' || status === 'failed' || status === 'unknown') return status
  return 'completed'
}

function uploadErrorMessage(body: BackendUploadResult, fallback: string): string {
  if (typeof body.message === 'string' && body.message) return body.message
  if (typeof body.detail === 'string' && body.detail) return body.detail
  return fallback
}
