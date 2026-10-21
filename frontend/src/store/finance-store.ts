/**
 * Single source of truth for financial entities.
 *
 * - Entities mirror `FinanceSnapshot`. Balances and summaries are NOT stored;
 *   they are derived with selectors (`selectors.ts`) from accounts + transactions.
 * - Every mutation goes through `api` and applies the *returned* entity, so the
 *   store never guesses what the server did.
 * - `pending` tracks in-flight operations by key so buttons can be disabled
 *   while a request is outstanding (prevents accidental double submits — but
 *   note this is NOT idempotency; the API layer owns that).
 * - Operations whose outcome is unknown are parked in `unresolvedOperations`
 *   until the user reconciles them.
 */
import { create } from 'zustand'
import {
  api,
  describeError,
  isOutcomeUnknown,
  type AccountInput,
  type BudgetInput,
  type CategoryInput,
  type DeleteCategoryResult,
  type ImportInput,
  type ImportResult,
  type RecurringRuleInput,
  type TransactionInput,
  type TransferInput,
  type TransferResult,
} from '@/api'
import {
  createId,
  nowISO,
  type Account,
  type Budget,
  type Category,
  type FinanceSnapshot,
  type Id,
  type RecurringRule,
  type Transaction,
} from '@/domain'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type UnresolvedKind = 'transaction' | 'transfer' | 'import'

export interface UnresolvedOperation {
  idempotencyKey: string
  kind: UnresolvedKind
  /** Short human description, e.g. "Transfer $500.00 Checking → Savings". */
  summary: string
  createdAt: string
}

export type ReconcileOutcome = 'committed' | 'not_committed'

interface FinanceState extends FinanceSnapshot {
  status: LoadStatus
  error: string | null
  pending: Record<string, true>
  unresolvedOperations: UnresolvedOperation[]

  // lifecycle
  load(): Promise<void>
  resetToSample(): Promise<void>
  resetToEmpty(): Promise<void>

  // accounts
  createAccount(input: AccountInput): Promise<Account>
  updateAccount(id: Id, input: AccountInput): Promise<Account>
  setAccountStatus(id: Id, status: Account['status']): Promise<Account>
  deleteAccount(id: Id): Promise<void>

  // transactions
  createTransaction(input: TransactionInput, summary: string): Promise<Transaction>
  updateTransaction(id: Id, input: TransactionInput): Promise<Transaction>
  deleteTransaction(id: Id): Promise<void>

  // transfers
  createTransfer(input: TransferInput, summary: string): Promise<TransferResult>
  deleteTransfer(id: Id): Promise<void>

  // categories
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(id: Id, input: CategoryInput): Promise<Category>
  setCategoryStatus(id: Id, status: Category['status']): Promise<Category>
  deleteCategory(id: Id, reassignToCategoryId: Id | null): Promise<DeleteCategoryResult>

  // budgets
  createBudget(input: BudgetInput): Promise<Budget>
  updateBudget(id: Id, input: BudgetInput): Promise<Budget>
  deleteBudget(id: Id): Promise<void>

  // recurring
  createRecurringRule(input: RecurringRuleInput): Promise<RecurringRule>
  updateRecurringRule(id: Id, input: RecurringRuleInput): Promise<RecurringRule>
  setRecurringRuleStatus(id: Id, status: 'active' | 'paused' | 'cancelled'): Promise<RecurringRule>
  deleteRecurringRule(id: Id): Promise<void>

  // import
  runImport(input: ImportInput, summary: string): Promise<ImportResult>

  // unknown-outcome reconciliation
  reconcile(idempotencyKey: string): Promise<ReconcileOutcome>
  dismissUnresolved(idempotencyKey: string): void
}

const EMPTY: FinanceSnapshot = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurringRules: [],
  transfers: [],
  importJobs: [],
}

function upsert<T extends { id: Id }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

function upsertMany<T extends { id: Id }>(list: T[], items: T[]): T[] {
  let out = list
  for (const item of items) out = upsert(out, item)
  return out
}

export const useFinanceStore = create<FinanceState>()((set, get) => {
  /** Wrap an API call with pending-state bookkeeping. */
  async function run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    set((s) => ({ pending: { ...s.pending, [key]: true } }))
    try {
      return await fn()
    } finally {
      set((s) => {
        const next = { ...s.pending }
        delete next[key]
        return { pending: next }
      })
    }
  }

  function park(kind: UnresolvedKind, idempotencyKey: string, summary: string) {
    set((s) => ({
      unresolvedOperations: [
        ...s.unresolvedOperations.filter((o) => o.idempotencyKey !== idempotencyKey),
        { kind, idempotencyKey, summary, createdAt: nowISO() },
      ],
    }))
  }

  function unpark(idempotencyKey: string) {
    set((s) => ({ unresolvedOperations: s.unresolvedOperations.filter((o) => o.idempotencyKey !== idempotencyKey) }))
  }

  return {
    ...EMPTY,
    status: 'idle',
    error: null,
    pending: {},
    unresolvedOperations: [],

    // ---------------------------------------------------------------- lifecycle
    async load() {
      set({ status: 'loading', error: null })
      try {
        const snapshot = await api.loadSnapshot()
        set({ ...snapshot, status: 'ready', error: null })
      } catch (e) {
        set({ status: 'error', error: describeError(e, 'Unable to load your financial data.') })
      }
    },

    async resetToSample() {
      await run('reset', async () => {
        const snapshot = await api.resetToSample()
        set({ ...snapshot, status: 'ready', error: null, unresolvedOperations: [] })
      })
    },

    async resetToEmpty() {
      await run('reset', async () => {
        const snapshot = await api.resetToEmpty()
        set({ ...snapshot, status: 'ready', error: null, unresolvedOperations: [] })
      })
    },

    // ----------------------------------------------------------------- accounts
    createAccount: (input) =>
      run('createAccount', async () => {
        const account = await api.createAccount(input)
        set((s) => ({ accounts: upsert(s.accounts, account) }))
        return account
      }),

    updateAccount: (id, input) =>
      run(`updateAccount:${id}`, async () => {
        const account = await api.updateAccount(id, input)
        set((s) => ({ accounts: upsert(s.accounts, account) }))
        return account
      }),

    setAccountStatus: (id, status) =>
      run(`accountStatus:${id}`, async () => {
        const account = await api.setAccountStatus(id, status)
        set((s) => ({ accounts: upsert(s.accounts, account) }))
        return account
      }),

    deleteAccount: (id) =>
      run(`deleteAccount:${id}`, async () => {
        await api.deleteAccount(id)
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          recurringRules: s.recurringRules.filter((r) => r.accountId !== id),
        }))
      }),

    // ------------------------------------------------------------- transactions
    createTransaction: (input, summary) =>
      run('createTransaction', async () => {
        const key = createId('idem')
        try {
          const tx = await api.createTransaction(input, key)
          set((s) => ({ transactions: upsert(s.transactions, tx) }))
          return tx
        } catch (e) {
          if (isOutcomeUnknown(e)) park('transaction', key, summary)
          throw e
        }
      }),

    updateTransaction: (id, input) =>
      run(`updateTransaction:${id}`, async () => {
        const tx = await api.updateTransaction(id, input)
        set((s) => ({ transactions: upsert(s.transactions, tx) }))
        return tx
      }),

    deleteTransaction: (id) =>
      run(`deleteTransaction:${id}`, async () => {
        await api.deleteTransaction(id)
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
      }),

    // ---------------------------------------------------------------- transfers
    createTransfer: (input, summary) =>
      run('createTransfer', async () => {
        const key = createId('idem')
        try {
          const result = await api.createTransfer(input, key)
          set((s) => ({
            transfers: upsert(s.transfers, result.transfer),
            transactions: upsertMany(s.transactions, result.transactions),
          }))
          return result
        } catch (e) {
          if (isOutcomeUnknown(e)) park('transfer', key, summary)
          throw e
        }
      }),

    deleteTransfer: (id) =>
      run(`deleteTransfer:${id}`, async () => {
        await api.deleteTransfer(id)
        set((s) => ({
          transfers: s.transfers.filter((t) => t.id !== id),
          transactions: s.transactions.filter((t) => t.transferId !== id),
        }))
      }),

    // --------------------------------------------------------------- categories
    createCategory: (input) =>
      run('createCategory', async () => {
        const category = await api.createCategory(input)
        set((s) => ({ categories: upsert(s.categories, category) }))
        return category
      }),

    updateCategory: (id, input) =>
      run(`updateCategory:${id}`, async () => {
        const category = await api.updateCategory(id, input)
        set((s) => ({ categories: upsert(s.categories, category) }))
        return category
      }),

    setCategoryStatus: (id, status) =>
      run(`categoryStatus:${id}`, async () => {
        const category = await api.setCategoryStatus(id, status)
        set((s) => ({ categories: upsert(s.categories, category) }))
        return category
      }),

    deleteCategory: (id, reassignTo) =>
      run(`deleteCategory:${id}`, async () => {
        const result = await api.deleteCategory(id, reassignTo)
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
          transactions: reassignTo
            ? s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: reassignTo } : t))
            : s.transactions,
          recurringRules: reassignTo
            ? s.recurringRules.map((r) => (r.categoryId === id ? { ...r, categoryId: reassignTo } : r))
            : s.recurringRules,
        }))
        return result
      }),

    // ------------------------------------------------------------------ budgets
    createBudget: (input) =>
      run('createBudget', async () => {
        const budget = await api.createBudget(input)
        set((s) => ({ budgets: upsert(s.budgets, budget) }))
        return budget
      }),

    updateBudget: (id, input) =>
      run(`updateBudget:${id}`, async () => {
        const budget = await api.updateBudget(id, input)
        set((s) => ({ budgets: upsert(s.budgets, budget) }))
        return budget
      }),

    deleteBudget: (id) =>
      run(`deleteBudget:${id}`, async () => {
        await api.deleteBudget(id)
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }))
      }),

    // ---------------------------------------------------------------- recurring
    createRecurringRule: (input) =>
      run('createRecurringRule', async () => {
        const rule = await api.createRecurringRule(input)
        set((s) => ({ recurringRules: upsert(s.recurringRules, rule) }))
        return rule
      }),

    updateRecurringRule: (id, input) =>
      run(`updateRecurringRule:${id}`, async () => {
        const rule = await api.updateRecurringRule(id, input)
        set((s) => ({ recurringRules: upsert(s.recurringRules, rule) }))
        return rule
      }),

    setRecurringRuleStatus: (id, status) =>
      run(`recurringStatus:${id}`, async () => {
        const rule = await api.setRecurringRuleStatus(id, status)
        set((s) => ({ recurringRules: upsert(s.recurringRules, rule) }))
        return rule
      }),

    deleteRecurringRule: (id) =>
      run(`deleteRecurringRule:${id}`, async () => {
        await api.deleteRecurringRule(id)
        set((s) => ({ recurringRules: s.recurringRules.filter((r) => r.id !== id) }))
      }),

    // ------------------------------------------------------------------- import
    runImport: (input, summary) =>
      run('runImport', async () => {
        const key = createId('idem')
        try {
          const result = await api.runImport(input, key)
          set((s) => ({
            importJobs: upsert(s.importJobs, result.job),
            transactions: upsertMany(s.transactions, result.transactions),
          }))
          return result
        } catch (e) {
          if (isOutcomeUnknown(e)) park('import', key, summary)
          throw e
        }
      }),

    // ------------------------------------------------------------ reconciliation
    reconcile: (idempotencyKey) =>
      run(`reconcile:${idempotencyKey}`, async () => {
        const op = get().unresolvedOperations.find((o) => o.idempotencyKey === idempotencyKey)
        if (!op) return 'not_committed'
        switch (op.kind) {
          case 'transaction': {
            const tx = await api.lookupTransaction(idempotencyKey)
            unpark(idempotencyKey)
            if (!tx) return 'not_committed'
            set((s) => ({ transactions: upsert(s.transactions, tx) }))
            return 'committed'
          }
          case 'transfer': {
            const lookup = await api.lookupTransfer(idempotencyKey)
            unpark(idempotencyKey)
            if (!lookup.found || !lookup.transfer) return 'not_committed'
            const transfer = lookup.transfer
            set((s) => ({
              transfers: upsert(s.transfers, transfer),
              transactions: upsertMany(s.transactions, lookup.transactions),
            }))
            return 'committed'
          }
          case 'import': {
            const result = await api.lookupImport(idempotencyKey)
            unpark(idempotencyKey)
            if (!result) return 'not_committed'
            set((s) => ({
              importJobs: upsert(s.importJobs, result.job),
              transactions: upsertMany(s.transactions, result.transactions),
            }))
            return 'committed'
          }
        }
      }),

    dismissUnresolved: (idempotencyKey) => unpark(idempotencyKey),
  }
})

/** Convenience hook: is an operation with this key in flight? */
export function useIsPending(key: string): boolean {
  return useFinanceStore((s) => !!s.pending[key])
}
