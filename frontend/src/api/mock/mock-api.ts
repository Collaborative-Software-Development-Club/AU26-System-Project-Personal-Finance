/**
 * In-browser implementation of `FinanceApi`.
 *
 * Holds a `FinanceSnapshot` in memory, persists every change to localStorage,
 * and simulates latency / failures deterministically (see simulation.ts).
 *
 * It enforces the same invariants the backend will own so the UI can be
 * exercised realistically: unique ids, referential integrity, idempotency keys,
 * "cannot delete account with transactions", "cannot delete category with
 * transactions without reassignment", transfer legs created atomically, etc.
 */
import {
  computeAccountBalance,
  computeNextRunDate,
  createId,
  isLiabilityAccountType,
  nowISO,
  TRANSFER_BLOCK_OVERDRAFT,
  type Account,
  type Budget,
  type Category,
  type FinanceSnapshot,
  type Id,
  type ImportJob,
  type RecurringRule,
  type Transaction,
  type Transfer,
} from '@/domain'
import { createEmptySnapshot, createSeedSnapshot } from '@/data/seed'
import { ApiError } from '../errors'
import type {
  AccountInput,
  BudgetInput,
  CategoryInput,
  DeleteCategoryResult,
  FinanceApi,
  ImportInput,
  ImportResult,
  RecurringRuleInput,
  TransactionInput,
  TransferInput,
  TransferLookup,
  TransferResult,
} from '../types'
import { failIfRequested, loseResponseIfRequested, simulateLatency } from './simulation'
import { readSnapshot, writeSnapshot } from './storage'

interface IdempotencyRecord {
  kind: 'transaction' | 'transfer' | 'import'
  entityId: Id
}

const IDEMPOTENCY_STORAGE_KEY = 'pf.mock-idempotency'

function readIdempotency(): Record<string, IdempotencyRecord> {
  try {
    const raw = window.localStorage.getItem(IDEMPOTENCY_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, IdempotencyRecord>) : {}
  } catch {
    return {}
  }
}

function writeIdempotency(records: Record<string, IdempotencyRecord>) {
  try {
    window.localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* ignore */
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export class MockFinanceApi implements FinanceApi {
  private db: FinanceSnapshot
  private idempotency: Record<string, IdempotencyRecord>

  constructor() {
    this.db = readSnapshot() ?? createSeedSnapshot()
    this.idempotency = readIdempotency()
    writeSnapshot(this.db)
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private persist() {
    writeSnapshot(this.db)
    writeIdempotency(this.idempotency)
  }

  private account(id: Id): Account {
    const a = this.db.accounts.find((x) => x.id === id)
    if (!a) throw new ApiError('not_found', 'Account not found.')
    return a
  }

  private category(id: Id): Category {
    const c = this.db.categories.find((x) => x.id === id)
    if (!c) throw new ApiError('not_found', 'Category not found.')
    return c
  }

  private transaction(id: Id): Transaction {
    const t = this.db.transactions.find((x) => x.id === id)
    if (!t) throw new ApiError('not_found', 'Transaction not found.')
    return t
  }

  private budget(id: Id): Budget {
    const b = this.db.budgets.find((x) => x.id === id)
    if (!b) throw new ApiError('not_found', 'Budget not found.')
    return b
  }

  private rule(id: Id): RecurringRule {
    const r = this.db.recurringRules.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found', 'Recurring rule not found.')
    return r
  }

  private assertActiveAccount(id: Id): Account {
    const a = this.account(id)
    if (a.status !== 'active') throw new ApiError('validation', `Account "${a.name}" is archived.`)
    return a
  }

  private assertCategoryFor(categoryId: Id, type: 'income' | 'expense'): Category {
    const c = this.category(categoryId)
    if (c.type !== 'both' && c.type !== type) {
      throw new ApiError('validation', `Category "${c.name}" cannot be used for ${type} transactions.`)
    }
    return c
  }

  private replace<T extends { id: Id }>(list: T[], item: T): T[] {
    return list.map((x) => (x.id === item.id ? item : x))
  }

  // -------------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------------

  async loadSnapshot(): Promise<FinanceSnapshot> {
    await simulateLatency()
    return clone(this.db)
  }

  async resetToSample(): Promise<FinanceSnapshot> {
    await simulateLatency()
    this.db = createSeedSnapshot()
    this.idempotency = {}
    this.persist()
    return clone(this.db)
  }

  async resetToEmpty(): Promise<FinanceSnapshot> {
    await simulateLatency()
    this.db = createEmptySnapshot()
    this.idempotency = {}
    this.persist()
    return clone(this.db)
  }

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------

  async createAccount(input: AccountInput): Promise<Account> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    if (input.openingBalance < 0 && !isLiabilityAccountType(input.type)) {
      throw new ApiError('validation', 'Only credit accounts may start with a negative balance.', { openingBalance: 'Invalid' })
    }
    const account: Account = {
      id: createId('acc'),
      name: input.name.trim(),
      type: input.type,
      currency: input.currency,
      openingBalance: input.openingBalance,
      status: 'active',
      description: input.description?.trim() || null,
      color: input.color,
      createdAt: nowISO(),
    }
    this.db.accounts = [...this.db.accounts, account]
    this.persist()
    return clone(account)
  }

  async updateAccount(id: Id, input: AccountInput): Promise<Account> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    const existing = this.account(id)
    const hasTx = this.db.transactions.some((t) => t.accountId === id)
    if (hasTx && input.currency !== existing.currency) {
      throw new ApiError('conflict', 'Currency cannot change once an account has transactions.', { currency: 'Locked' })
    }
    const updated: Account = {
      ...existing,
      name: input.name.trim(),
      type: input.type,
      currency: input.currency,
      openingBalance: input.openingBalance,
      description: input.description?.trim() || null,
      color: input.color,
    }
    this.db.accounts = this.replace(this.db.accounts, updated)
    this.persist()
    return clone(updated)
  }

  async setAccountStatus(id: Id, status: Account['status']): Promise<Account> {
    await simulateLatency()
    const updated = { ...this.account(id), status }
    this.db.accounts = this.replace(this.db.accounts, updated)
    this.persist()
    return clone(updated)
  }

  async deleteAccount(id: Id): Promise<void> {
    await simulateLatency()
    const account = this.account(id)
    const count = this.db.transactions.filter((t) => t.accountId === id).length
    if (count > 0) {
      throw new ApiError(
        'conflict',
        `"${account.name}" has ${count} transaction${count === 1 ? '' : 's'}. Archive it instead, or delete its transactions first.`,
      )
    }
    this.db.accounts = this.db.accounts.filter((a) => a.id !== id)
    this.db.recurringRules = this.db.recurringRules.filter((r) => r.accountId !== id)
    this.persist()
  }

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------

  async createTransaction(input: TransactionInput, idempotencyKey: string): Promise<Transaction> {
    await simulateLatency(input.description)
    const existing = this.idempotency[idempotencyKey]
    if (existing?.kind === 'transaction') {
      // Same key → same result. This is what makes retries safe.
      return clone(this.transaction(existing.entityId))
    }
    failIfRequested(input.description)
    const account = this.assertActiveAccount(input.accountId)
    this.assertCategoryFor(input.categoryId, input.type)
    if (input.amount <= 0) throw new ApiError('validation', 'Amount must be greater than zero.', { amount: 'Invalid' })
    const tx: Transaction = {
      id: createId('tx'),
      description: input.description.trim(),
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      accountId: input.accountId,
      categoryId: input.categoryId,
      date: input.date,
      notes: input.notes?.trim() || null,
      source: 'manual',
      status: 'posted',
      transferId: null,
      transferDirection: null,
      recurringRuleId: null,
      importId: null,
      createdAt: nowISO(),
    }
    this.db.transactions = [...this.db.transactions, tx]
    this.idempotency[idempotencyKey] = { kind: 'transaction', entityId: tx.id }
    this.persist()
    loseResponseIfRequested(input.description, idempotencyKey)
    return clone(tx)
  }

  async lookupTransaction(idempotencyKey: string): Promise<Transaction | null> {
    await simulateLatency()
    const record = this.idempotency[idempotencyKey]
    if (!record || record.kind !== 'transaction') return null
    const tx = this.db.transactions.find((t) => t.id === record.entityId)
    return tx ? clone(tx) : null
  }

  async updateTransaction(id: Id, input: TransactionInput): Promise<Transaction> {
    await simulateLatency(input.description)
    failIfRequested(input.description)
    const existing = this.transaction(id)
    if (existing.type === 'transfer') {
      throw new ApiError('conflict', 'Transfer legs cannot be edited directly. Delete the transfer and record it again.')
    }
    const account = this.assertActiveAccount(input.accountId)
    this.assertCategoryFor(input.categoryId, input.type)
    if (input.amount <= 0) throw new ApiError('validation', 'Amount must be greater than zero.', { amount: 'Invalid' })
    const updated: Transaction = {
      ...existing,
      description: input.description.trim(),
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      accountId: input.accountId,
      categoryId: input.categoryId,
      date: input.date,
      notes: input.notes?.trim() || null,
    }
    this.db.transactions = this.replace(this.db.transactions, updated)
    this.persist()
    return clone(updated)
  }

  async deleteTransaction(id: Id): Promise<void> {
    await simulateLatency()
    const tx = this.transaction(id)
    if (tx.type === 'transfer') {
      throw new ApiError('conflict', 'This transaction is one leg of a transfer. Delete the transfer instead so both accounts stay consistent.')
    }
    this.db.transactions = this.db.transactions.filter((t) => t.id !== id)
    this.persist()
  }

  // -------------------------------------------------------------------------
  // Transfers
  // -------------------------------------------------------------------------

  async createTransfer(input: TransferInput, idempotencyKey: string): Promise<TransferResult> {
    await simulateLatency(input.description)
    const existing = this.idempotency[idempotencyKey]
    if (existing?.kind === 'transfer') {
      const lookup = await this.lookupTransferSync(idempotencyKey)
      if (lookup.transfer) return { transfer: lookup.transfer, transactions: lookup.transactions }
    }
    failIfRequested(input.description)
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new ApiError('validation', 'Source and destination must differ.', { destinationAccountId: 'Same account' })
    }
    const source = this.assertActiveAccount(input.sourceAccountId)
    const destination = this.assertActiveAccount(input.destinationAccountId)
    if (source.currency !== destination.currency) {
      throw new ApiError('validation', 'Cross-currency transfers are not supported.', { destinationAccountId: 'Currency mismatch' })
    }
    if (input.amount <= 0) throw new ApiError('validation', 'Amount must be greater than zero.', { amount: 'Invalid' })
    if (TRANSFER_BLOCK_OVERDRAFT && !isLiabilityAccountType(source.type)) {
      const balance = computeAccountBalance(source, this.db.transactions)
      if (balance - input.amount < 0) {
        throw new ApiError('conflict', `Insufficient funds in "${source.name}".`, { amount: 'Insufficient funds' })
      }
    }
    const createdAt = nowISO()
    const transfer: Transfer = {
      id: createId('tr'),
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: input.amount,
      currency: source.currency,
      date: input.date,
      description: input.description?.trim() || null,
      status: 'completed',
      createdAt,
    }
    const memo = transfer.description
    const legs: Transaction[] = [
      {
        id: createId('tx'),
        description: memo ?? `Transfer to ${destination.name}`,
        type: 'transfer',
        amount: input.amount,
        currency: source.currency,
        accountId: source.id,
        categoryId: null,
        date: input.date,
        notes: null,
        source: 'transfer',
        status: 'posted',
        transferId: transfer.id,
        transferDirection: 'out',
        recurringRuleId: null,
        importId: null,
        createdAt,
      },
      {
        id: createId('tx'),
        description: memo ?? `Transfer from ${source.name}`,
        type: 'transfer',
        amount: input.amount,
        currency: source.currency,
        accountId: destination.id,
        categoryId: null,
        date: input.date,
        notes: null,
        source: 'transfer',
        status: 'posted',
        transferId: transfer.id,
        transferDirection: 'in',
        recurringRuleId: null,
        importId: null,
        createdAt,
      },
    ]
    // Both legs and the transfer record are written together (atomic in the mock).
    this.db.transfers = [...this.db.transfers, transfer]
    this.db.transactions = [...this.db.transactions, ...legs]
    this.idempotency[idempotencyKey] = { kind: 'transfer', entityId: transfer.id }
    this.persist()
    loseResponseIfRequested(input.description, idempotencyKey)
    return { transfer: clone(transfer), transactions: clone(legs) }
  }

  private async lookupTransferSync(idempotencyKey: string): Promise<TransferLookup> {
    const record = this.idempotency[idempotencyKey]
    if (!record || record.kind !== 'transfer') return { found: false, transfer: null, transactions: [] }
    const transfer = this.db.transfers.find((t) => t.id === record.entityId) ?? null
    const transactions = this.db.transactions.filter((t) => t.transferId === record.entityId)
    return { found: !!transfer, transfer: transfer ? clone(transfer) : null, transactions: clone(transactions) }
  }

  async lookupTransfer(idempotencyKey: string): Promise<TransferLookup> {
    await simulateLatency()
    return this.lookupTransferSync(idempotencyKey)
  }

  async deleteTransfer(id: Id): Promise<void> {
    await simulateLatency()
    if (!this.db.transfers.some((t) => t.id === id)) throw new ApiError('not_found', 'Transfer not found.')
    this.db.transfers = this.db.transfers.filter((t) => t.id !== id)
    this.db.transactions = this.db.transactions.filter((t) => t.transferId !== id)
    this.persist()
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------

  private assertUniqueCategoryName(name: string, exceptId: Id | null) {
    const dup = this.db.categories.find(
      (c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
    if (dup) throw new ApiError('conflict', `A category named "${dup.name}" already exists.`, { name: 'Duplicate' })
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    this.assertUniqueCategoryName(input.name, null)
    const category: Category = {
      id: createId('cat'),
      name: input.name.trim(),
      type: input.type,
      color: input.color,
      icon: input.icon,
      status: 'active',
    }
    this.db.categories = [...this.db.categories, category]
    this.persist()
    return clone(category)
  }

  async updateCategory(id: Id, input: CategoryInput): Promise<Category> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    const existing = this.category(id)
    this.assertUniqueCategoryName(input.name, id)
    const updated: Category = { ...existing, name: input.name.trim(), type: input.type, color: input.color, icon: input.icon }
    this.db.categories = this.replace(this.db.categories, updated)
    this.persist()
    return clone(updated)
  }

  async setCategoryStatus(id: Id, status: Category['status']): Promise<Category> {
    await simulateLatency()
    const updated = { ...this.category(id), status }
    this.db.categories = this.replace(this.db.categories, updated)
    this.persist()
    return clone(updated)
  }

  async deleteCategory(id: Id, reassignToCategoryId: Id | null): Promise<DeleteCategoryResult> {
    await simulateLatency()
    const category = this.category(id)
    const affected = this.db.transactions.filter((t) => t.categoryId === id)
    const rules = this.db.recurringRules.filter((r) => r.categoryId === id)
    const budgets = this.db.budgets.filter((b) => b.categoryId === id)
    if (affected.length + rules.length > 0) {
      if (!reassignToCategoryId) {
        throw new ApiError(
          'conflict',
          `"${category.name}" is used by ${affected.length} transaction(s) and ${rules.length} recurring rule(s). Choose a category to move them to.`,
        )
      }
      if (reassignToCategoryId === id) throw new ApiError('validation', 'Choose a different category.')
      this.category(reassignToCategoryId)
      this.db.transactions = this.db.transactions.map((t) =>
        t.categoryId === id ? { ...t, categoryId: reassignToCategoryId } : t,
      )
      this.db.recurringRules = this.db.recurringRules.map((r) =>
        r.categoryId === id ? { ...r, categoryId: reassignToCategoryId } : r,
      )
    }
    if (budgets.length > 0) this.db.budgets = this.db.budgets.filter((b) => b.categoryId !== id)
    this.db.categories = this.db.categories.filter((c) => c.id !== id)
    this.persist()
    return { reassignedTransactionIds: affected.map((t) => t.id) }
  }

  // -------------------------------------------------------------------------
  // Budgets
  // -------------------------------------------------------------------------

  private assertNoBudgetOverlap(input: BudgetInput, exceptId: Id | null) {
    const end = input.endMonth ?? '9999-12'
    const conflict = this.db.budgets.find((b) => {
      if (b.id === exceptId || b.categoryId !== input.categoryId) return false
      const bEnd = b.endMonth ?? '9999-12'
      return b.startMonth <= end && input.startMonth <= bEnd
    })
    if (conflict) throw new ApiError('conflict', 'A budget for this category already covers part of this period.', { categoryId: 'Overlap' })
  }

  async createBudget(input: BudgetInput): Promise<Budget> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    const category = this.category(input.categoryId)
    if (category.type === 'income') throw new ApiError('validation', 'Budgets track expense categories only.', { categoryId: 'Invalid' })
    if (input.amount <= 0) throw new ApiError('validation', 'Budget amount must be greater than zero.', { amount: 'Invalid' })
    this.assertNoBudgetOverlap(input, null)
    const budget: Budget = {
      id: createId('bud'),
      name: input.name?.trim() || null,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      period: 'monthly',
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      warningThreshold: input.warningThreshold,
      createdAt: nowISO(),
    }
    this.db.budgets = [...this.db.budgets, budget]
    this.persist()
    return clone(budget)
  }

  async updateBudget(id: Id, input: BudgetInput): Promise<Budget> {
    await simulateLatency(input.name)
    failIfRequested(input.name)
    const existing = this.budget(id)
    const category = this.category(input.categoryId)
    if (category.type === 'income') throw new ApiError('validation', 'Budgets track expense categories only.', { categoryId: 'Invalid' })
    if (input.amount <= 0) throw new ApiError('validation', 'Budget amount must be greater than zero.', { amount: 'Invalid' })
    this.assertNoBudgetOverlap(input, id)
    const updated: Budget = {
      ...existing,
      name: input.name?.trim() || null,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      warningThreshold: input.warningThreshold,
    }
    this.db.budgets = this.replace(this.db.budgets, updated)
    this.persist()
    return clone(updated)
  }

  async deleteBudget(id: Id): Promise<void> {
    await simulateLatency()
    this.budget(id)
    this.db.budgets = this.db.budgets.filter((b) => b.id !== id)
    this.persist()
  }

  // -------------------------------------------------------------------------
  // Recurring rules
  // -------------------------------------------------------------------------

  private buildRule(base: Partial<RecurringRule>, input: RecurringRuleInput): RecurringRule {
    const account = this.assertActiveAccount(input.accountId)
    this.assertCategoryFor(input.categoryId, input.type)
    if (input.amount <= 0) throw new ApiError('validation', 'Amount must be greater than zero.', { amount: 'Invalid' })
    if (input.endDate && input.endDate < input.startDate) {
      throw new ApiError('validation', 'End date cannot be before start date.', { endDate: 'Invalid' })
    }
    const schedule = { startDate: input.startDate, endDate: input.endDate, frequency: input.frequency, interval: input.interval }
    const next = computeNextRunDate(schedule)
    const status: RecurringRule['status'] =
      base.status === 'paused' || base.status === 'cancelled' ? base.status : next ? 'active' : 'completed'
    return {
      id: base.id ?? createId('rule'),
      description: input.description.trim(),
      type: input.type,
      amount: input.amount,
      currency: account.currency,
      accountId: input.accountId,
      categoryId: input.categoryId,
      frequency: input.frequency,
      interval: Math.max(1, Math.trunc(input.interval)),
      startDate: input.startDate,
      endDate: input.endDate,
      nextRunDate: status === 'active' ? next : null,
      status,
      notes: input.notes?.trim() || null,
      createdAt: base.createdAt ?? nowISO(),
    }
  }

  async createRecurringRule(input: RecurringRuleInput): Promise<RecurringRule> {
    await simulateLatency(input.description)
    failIfRequested(input.description)
    const rule = this.buildRule({}, input)
    this.db.recurringRules = [...this.db.recurringRules, rule]
    this.persist()
    return clone(rule)
  }

  async updateRecurringRule(id: Id, input: RecurringRuleInput): Promise<RecurringRule> {
    await simulateLatency(input.description)
    failIfRequested(input.description)
    const existing = this.rule(id)
    const rule = this.buildRule(existing, input)
    this.db.recurringRules = this.replace(this.db.recurringRules, rule)
    this.persist()
    return clone(rule)
  }

  async setRecurringRuleStatus(id: Id, status: 'active' | 'paused' | 'cancelled'): Promise<RecurringRule> {
    await simulateLatency()
    const existing = this.rule(id)
    if (existing.status === 'cancelled') throw new ApiError('conflict', 'A cancelled rule cannot be changed.')
    let updated: RecurringRule
    if (status === 'active') {
      const next = computeNextRunDate(existing)
      updated = next ? { ...existing, status: 'active', nextRunDate: next } : { ...existing, status: 'completed', nextRunDate: null }
    } else {
      updated = { ...existing, status, nextRunDate: status === 'paused' ? existing.nextRunDate : null }
    }
    this.db.recurringRules = this.replace(this.db.recurringRules, updated)
    this.persist()
    return clone(updated)
  }

  async deleteRecurringRule(id: Id): Promise<void> {
    await simulateLatency()
    this.rule(id)
    this.db.recurringRules = this.db.recurringRules.filter((r) => r.id !== id)
    // Historical transactions keep their recurringRuleId for traceability.
    this.persist()
  }

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async runImport(input: ImportInput, idempotencyKey: string): Promise<ImportResult> {
    await simulateLatency(input.fileName)
    const existing = this.idempotency[idempotencyKey]
    if (existing?.kind === 'import') {
      const job = this.db.importJobs.find((j) => j.id === existing.entityId)
      if (job) return { job: clone(job), transactions: clone(this.db.transactions.filter((t) => t.importId === job.id)) }
    }
    failIfRequested(input.fileName)
    const jobId = createId('imp')
    const createdAt = nowISO()
    const created: Transaction[] = []
    const errors = [...input.invalidRows]
    for (const row of input.rows) {
      try {
        const account = this.assertActiveAccount(row.accountId)
        if (row.categoryId) this.assertCategoryFor(row.categoryId, row.type)
        if (row.amount <= 0) throw new ApiError('validation', 'Amount must be greater than zero.')
        created.push({
          id: createId('tx'),
          description: row.description.trim() || 'Imported transaction',
          type: row.type,
          amount: row.amount,
          currency: account.currency,
          accountId: row.accountId,
          categoryId: row.categoryId,
          date: row.date,
          notes: row.notes,
          source: 'import',
          status: 'posted',
          transferId: null,
          transferDirection: null,
          recurringRuleId: null,
          importId: jobId,
          createdAt,
        })
      } catch (e) {
        errors.push({ row: row.row, field: null, message: e instanceof Error ? e.message : 'Row rejected.' })
      }
    }
    const failedRows = errors.length
    const totalRows = input.rows.length + input.invalidRows.length + input.skippedRows
    const job: ImportJob = {
      id: jobId,
      fileName: input.fileName,
      createdAt,
      accountId: input.accountId,
      totalRows,
      successfulRows: created.length,
      failedRows,
      skippedRows: input.skippedRows,
      status: created.length === 0 && failedRows > 0 ? 'failed' : failedRows > 0 ? 'partial' : 'completed',
      errors,
    }
    this.db.transactions = [...this.db.transactions, ...created]
    this.db.importJobs = [job, ...this.db.importJobs]
    this.idempotency[idempotencyKey] = { kind: 'import', entityId: jobId }
    this.persist()
    loseResponseIfRequested(input.fileName, idempotencyKey)
    return { job: clone(job), transactions: clone(created) }
  }

  async lookupImport(idempotencyKey: string): Promise<ImportResult | null> {
    await simulateLatency()
    const record = this.idempotency[idempotencyKey]
    if (!record || record.kind !== 'import') return null
    const job = this.db.importJobs.find((j) => j.id === record.entityId)
    if (!job) return null
    return { job: clone(job), transactions: clone(this.db.transactions.filter((t) => t.importId === job.id)) }
  }
}
