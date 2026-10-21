/**
 * Deterministic sample dataset.
 *
 * Dates are generated relative to "today" so the dashboard always shows recent
 * activity, but the pseudo-random generator is seeded, so the dataset for a
 * given day is identical across reloads. Amounts are integer minor units (cents).
 */
import { addDays, endOfMonth, getDaysInMonth, startOfMonth } from 'date-fns'
import {
  computeNextRunDate,
  lastMonthKeys,
  monthKeyToDate,
  toISODate,
  todayISO,
  type Account,
  type Budget,
  type Category,
  type FinanceSnapshot,
  type ImportJob,
  type RecurringRule,
  type Transaction,
  type Transfer,
  type ISODate,
  type Id,
  type MinorUnits,
} from '@/domain'

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Static entities
// ---------------------------------------------------------------------------

const CREATED = '2025-04-01T10:00:00.000Z'

export const SEED_ACCOUNTS: Account[] = [
  { id: 'acc_checking', name: 'Everyday Checking', type: 'checking', currency: 'USD', openingBalance: 240_000, status: 'active', description: 'Primary account for bills and daily spending.', color: '#1e40af', createdAt: CREATED },
  { id: 'acc_savings', name: 'Emergency Savings', type: 'savings', currency: 'USD', openingBalance: 1_200_000, status: 'active', description: 'Three months of expenses, hopefully.', color: '#059669', createdAt: CREATED },
  { id: 'acc_cash', name: 'Wallet', type: 'cash', currency: 'USD', openingBalance: 12_000, status: 'active', description: null, color: '#ca8a04', createdAt: CREATED },
  { id: 'acc_credit', name: 'Visa Rewards', type: 'credit', currency: 'USD', openingBalance: 0, status: 'active', description: 'Paid in full every month.', color: '#7c3aed', createdAt: CREATED },
  { id: 'acc_old', name: 'Old Student Checking', type: 'checking', currency: 'USD', openingBalance: 0, status: 'archived', description: 'Closed in 2025.', color: '#64748b', createdAt: '2025-01-15T10:00:00.000Z' },
]

export const SEED_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', color: '#ea580c', icon: 'utensils', status: 'active' },
  { id: 'cat_transport', name: 'Transportation', type: 'expense', color: '#0ea5e9', icon: 'car', status: 'active' },
  { id: 'cat_housing', name: 'Housing', type: 'expense', color: '#1e40af', icon: 'home', status: 'active' },
  { id: 'cat_utilities', name: 'Utilities', type: 'expense', color: '#0f766e', icon: 'zap', status: 'active' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', color: '#db2777', icon: 'shopping-bag', status: 'active' },
  { id: 'cat_health', name: 'Healthcare', type: 'expense', color: '#dc2626', icon: 'heart-pulse', status: 'active' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#7c3aed', icon: 'clapperboard', status: 'active' },
  { id: 'cat_education', name: 'Education', type: 'expense', color: '#6366f1', icon: 'graduation-cap', status: 'active' },
  { id: 'cat_travel', name: 'Travel', type: 'expense', color: '#16a34a', icon: 'plane', status: 'active' },
  { id: 'cat_other_expense', name: 'Other Expenses', type: 'expense', color: '#64748b', icon: 'circle-ellipsis', status: 'active' },
  { id: 'cat_salary', name: 'Salary', type: 'income', color: '#059669', icon: 'briefcase', status: 'active' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#0ea5e9', icon: 'laptop', status: 'active' },
  { id: 'cat_investments', name: 'Investments', type: 'income', color: '#1e40af', icon: 'trending-up', status: 'active' },
  { id: 'cat_gifts', name: 'Gifts', type: 'both', color: '#db2777', icon: 'gift', status: 'active' },
  { id: 'cat_other_income', name: 'Other Income', type: 'income', color: '#64748b', icon: 'coins', status: 'active' },
]

interface RuleSeed {
  id: Id
  description: string
  type: 'income' | 'expense'
  amount: MinorUnits
  accountId: Id
  categoryId: Id
  day: number
  status: RecurringRule['status']
  notes: string | null
}

const RULE_SEEDS: RuleSeed[] = [
  { id: 'rule_salary', description: 'Monthly salary — Northwind Labs', type: 'income', amount: 520_000, accountId: 'acc_checking', categoryId: 'cat_salary', day: 1, status: 'active', notes: 'Net pay after tax.' },
  { id: 'rule_rent', description: 'Rent — 14 Maple St', type: 'expense', amount: 145_000, accountId: 'acc_checking', categoryId: 'cat_housing', day: 1, status: 'active', notes: null },
  { id: 'rule_internet', description: 'Fibre internet', type: 'expense', amount: 6_999, accountId: 'acc_checking', categoryId: 'cat_utilities', day: 8, status: 'active', notes: null },
  { id: 'rule_streaming', description: 'Streaming subscription', type: 'expense', amount: 1_599, accountId: 'acc_credit', categoryId: 'cat_entertainment', day: 15, status: 'active', notes: null },
  { id: 'rule_gym', description: 'Gym membership', type: 'expense', amount: 4_500, accountId: 'acc_credit', categoryId: 'cat_health', day: 5, status: 'active', notes: null },
  { id: 'rule_music', description: 'Music subscription', type: 'expense', amount: 1_099, accountId: 'acc_credit', categoryId: 'cat_entertainment', day: 20, status: 'paused', notes: 'Paused while travelling.' },
]

const GROCERY_STORES = ['Green Market', 'Costless Wholesale', 'Corner Grocer', 'Fresh Fields']
const RESTAURANTS = ['Taco Row', 'Noodle House', 'Blue Door Café', 'Pizza Collective', 'Sushi Go']
const SHOPS = ['Northline Outfitters', 'Everyday Goods', 'Bookmark Books', 'Home Basics']
const TRANSPORT = ['Metro card top-up', 'Fuel — Shell', 'Ride share', 'Parking']
const ENTERTAINMENT = ['Cinema tickets', 'Concert — The Weekenders', 'Board game night', 'Museum entry']

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function createSeedSnapshot(now: Date = new Date()): FinanceSnapshot {
  const rand = mulberry32(20261020)
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min))
  const today: ISODate = toISODate(now)
  const months = lastMonthKeys(6)
  const firstMonth = months[0]

  const transactions: Transaction[] = []
  const transfers: Transfer[] = []
  let txCounter = 0

  const push = (tx: Omit<Transaction, 'id' | 'createdAt' | 'currency' | 'status'> & { createdAt?: string }) => {
    if (tx.date > today) return null
    const id = `tx_seed_${String(++txCounter).padStart(4, '0')}`
    const full: Transaction = {
      id,
      currency: 'USD',
      status: 'posted',
      createdAt: tx.createdAt ?? `${tx.date}T12:00:00.000Z`,
      ...tx,
    }
    transactions.push(full)
    return full
  }

  const clampDay = (monthStart: Date, day: number) => {
    const d = new Date(monthStart)
    d.setDate(Math.min(day, getDaysInMonth(monthStart)))
    return toISODate(d)
  }

  for (const month of months) {
    const monthStart = startOfMonth(monthKeyToDate(month))
    const monthEnd = endOfMonth(monthStart)
    const dayIn = (day: number) => clampDay(monthStart, day)
    const randomDay = () => toISODate(addDays(monthStart, between(0, getDaysInMonth(monthStart) - 1)))

    // Recurring-rule generated transactions (only past occurrences).
    for (const rule of RULE_SEEDS) {
      if (rule.status !== 'active' && month >= months[months.length - 2]) continue
      push({
        description: rule.description,
        type: rule.type,
        amount: rule.amount,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        date: dayIn(rule.day),
        notes: rule.notes,
        source: 'recurring',
        transferId: null,
        transferDirection: null,
        recurringRuleId: rule.id,
        importId: null,
      })
    }

    // Utilities
    push({ description: 'Electricity — City Power', type: 'expense', amount: between(6_500, 11_500), accountId: 'acc_checking', categoryId: 'cat_utilities', date: dayIn(12), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    push({ description: 'Mobile plan', type: 'expense', amount: 4_500, accountId: 'acc_checking', categoryId: 'cat_utilities', date: dayIn(18), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })

    // Groceries roughly weekly
    for (let w = 0; w < 4; w++) {
      push({ description: pick(GROCERY_STORES), type: 'expense', amount: between(4_200, 13_800), accountId: w % 2 === 0 ? 'acc_checking' : 'acc_credit', categoryId: 'cat_food', date: dayIn(3 + w * 7 + between(0, 2)), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    }
    // Dining out
    for (let i = 0; i < between(3, 6); i++) {
      push({ description: pick(RESTAURANTS), type: 'expense', amount: between(1_400, 7_800), accountId: rand() < 0.7 ? 'acc_credit' : 'acc_cash', categoryId: 'cat_food', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    }
    // Transport
    for (let i = 0; i < between(2, 4); i++) {
      push({ description: pick(TRANSPORT), type: 'expense', amount: between(1_200, 6_500), accountId: rand() < 0.5 ? 'acc_checking' : 'acc_credit', categoryId: 'cat_transport', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    }
    // Shopping
    for (let i = 0; i < between(1, 3); i++) {
      push({ description: pick(SHOPS), type: 'expense', amount: between(2_500, 18_900), accountId: 'acc_credit', categoryId: 'cat_shopping', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    }
    // Entertainment
    for (let i = 0; i < between(1, 2); i++) {
      push({ description: pick(ENTERTAINMENT), type: 'expense', amount: between(1_500, 9_000), accountId: 'acc_credit', categoryId: 'cat_entertainment', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    }
    // Occasional
    if (rand() < 0.5) push({ description: 'Pharmacy', type: 'expense', amount: between(1_200, 4_800), accountId: 'acc_checking', categoryId: 'cat_health', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    if (rand() < 0.4) push({ description: 'Freelance — design retainer', type: 'income', amount: between(40_000, 120_000), accountId: 'acc_checking', categoryId: 'cat_freelance', date: dayIn(between(10, 25)), notes: 'Invoice paid.', source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    if (rand() < 0.5) push({ description: 'Dividend — index fund', type: 'income', amount: between(2_500, 9_000), accountId: 'acc_savings', categoryId: 'cat_investments', date: dayIn(between(20, 28)), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })
    if (rand() < 0.3) push({ description: 'Online course', type: 'expense', amount: between(2_900, 9_900), accountId: 'acc_credit', categoryId: 'cat_education', date: randomDay(), notes: null, source: 'manual', transferId: null, transferDirection: null, recurringRuleId: null, importId: null })

    // Monthly transfer to savings (checking → savings)
    const savingsDate = dayIn(2)
    if (savingsDate <= today) {
      const transferId = `tr_seed_savings_${month}`
      transfers.push({ id: transferId, sourceAccountId: 'acc_checking', destinationAccountId: 'acc_savings', amount: 50_000, currency: 'USD', date: savingsDate, description: 'Monthly savings', status: 'completed', createdAt: `${savingsDate}T09:00:00.000Z` })
      push({ description: 'Transfer to Emergency Savings', type: 'transfer', amount: 50_000, accountId: 'acc_checking', categoryId: null, date: savingsDate, notes: null, source: 'transfer', transferId, transferDirection: 'out', recurringRuleId: null, importId: null })
      push({ description: 'Transfer from Everyday Checking', type: 'transfer', amount: 50_000, accountId: 'acc_savings', categoryId: null, date: savingsDate, notes: null, source: 'transfer', transferId, transferDirection: 'in', recurringRuleId: null, importId: null })
    }

    // Credit card payment near month end for the previous month's spend (checking → credit)
    const paymentDate = toISODate(addDays(monthEnd, -3))
    if (paymentDate <= today && month !== firstMonth) {
      const prevMonth = months[months.indexOf(month) - 1]
      const owed = transactions
        .filter((t) => t.accountId === 'acc_credit' && t.type === 'expense' && t.date.startsWith(prevMonth))
        .reduce((s, t) => s + t.amount, 0)
      if (owed > 0) {
        const transferId = `tr_seed_cc_${month}`
        transfers.push({ id: transferId, sourceAccountId: 'acc_checking', destinationAccountId: 'acc_credit', amount: owed, currency: 'USD', date: paymentDate, description: 'Credit card payment', status: 'completed', createdAt: `${paymentDate}T09:00:00.000Z` })
        push({ description: 'Payment to Visa Rewards', type: 'transfer', amount: owed, accountId: 'acc_checking', categoryId: null, date: paymentDate, notes: null, source: 'transfer', transferId, transferDirection: 'out', recurringRuleId: null, importId: null })
        push({ description: 'Payment from Everyday Checking', type: 'transfer', amount: owed, accountId: 'acc_credit', categoryId: null, date: paymentDate, notes: null, source: 'transfer', transferId, transferDirection: 'in', recurringRuleId: null, importId: null })
      }
    }
  }

  // An imported batch two months ago (cash expenses from a bank export).
  const importMonth = months[months.length - 3]
  const importStart = startOfMonth(monthKeyToDate(importMonth))
  const importId = 'imp_seed_001'
  let importedCount = 0
  for (let i = 0; i < 9; i++) {
    const tx = push({
      description: ['Coffee cart', 'Farmers market', 'Laundromat', 'Bus fare', 'Bakery'][i % 5],
      type: 'expense',
      amount: between(350, 2_400),
      accountId: 'acc_cash',
      categoryId: i % 5 === 3 ? 'cat_transport' : 'cat_food',
      date: toISODate(addDays(importStart, between(0, 27))),
      notes: null,
      source: 'import',
      transferId: null,
      transferDirection: null,
      recurringRuleId: null,
      importId,
      createdAt: `${toISODate(addDays(importStart, 28))}T15:30:00.000Z`,
    })
    if (tx) importedCount++
  }

  const importJobs: ImportJob[] = [
    {
      id: importId,
      fileName: 'cash-export-q3.csv',
      createdAt: `${toISODate(addDays(importStart, 28))}T15:30:00.000Z`,
      accountId: 'acc_cash',
      totalRows: importedCount + 2,
      successfulRows: importedCount,
      failedRows: 2,
      skippedRows: 0,
      status: 'partial',
      errors: [
        { row: 4, field: 'amount', message: 'Amount "12,5O" is not a number.' },
        { row: 11, field: 'date', message: 'Date "31/02/2026" is not a valid date.' },
      ],
    },
    {
      id: 'imp_seed_000',
      fileName: 'bank-statement-may.csv',
      createdAt: `${toISODate(addDays(monthKeyToDate(months[1]), 10))}T11:05:00.000Z`,
      accountId: 'acc_checking',
      totalRows: 18,
      successfulRows: 0,
      failedRows: 18,
      skippedRows: 0,
      status: 'failed',
      errors: [{ row: 1, field: null, message: 'Required column "amount" was not mapped.' }],
    },
  ]

  const budgets: Budget[] = [
    { id: 'bud_food', name: null, categoryId: 'cat_food', amount: 60_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: null, createdAt: CREATED },
    { id: 'bud_transport', name: null, categoryId: 'cat_transport', amount: 15_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: null, createdAt: CREATED },
    { id: 'bud_shopping', name: 'Fun money', categoryId: 'cat_shopping', amount: 25_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: 0.75, createdAt: CREATED },
    { id: 'bud_entertainment', name: null, categoryId: 'cat_entertainment', amount: 12_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: null, createdAt: CREATED },
    { id: 'bud_utilities', name: null, categoryId: 'cat_utilities', amount: 22_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: 0.9, createdAt: CREATED },
    { id: 'bud_housing', name: null, categoryId: 'cat_housing', amount: 150_000, currency: 'USD', period: 'monthly', startMonth: firstMonth, endMonth: null, warningThreshold: null, createdAt: CREATED },
  ]

  const recurringRules: RecurringRule[] = RULE_SEEDS.map((r) => {
    const startDate = clampDay(startOfMonth(monthKeyToDate(firstMonth)), r.day)
    const schedule = { startDate, endDate: null, frequency: 'monthly' as const, interval: 1 }
    return {
      id: r.id,
      description: r.description,
      type: r.type,
      amount: r.amount,
      currency: 'USD',
      accountId: r.accountId,
      categoryId: r.categoryId,
      frequency: 'monthly',
      interval: 1,
      startDate,
      endDate: null,
      nextRunDate: r.status === 'active' ? computeNextRunDate(schedule, todayISO(), false) : null,
      status: r.status,
      notes: r.notes,
      createdAt: CREATED,
    }
  })

  return {
    accounts: SEED_ACCOUNTS,
    categories: SEED_CATEGORIES,
    transactions,
    budgets,
    recurringRules,
    transfers,
    importJobs,
  }
}

/** Empty dataset — useful to demonstrate every empty state. */
export function createEmptySnapshot(): FinanceSnapshot {
  return {
    accounts: [],
    categories: SEED_CATEGORIES,
    transactions: [],
    budgets: [],
    recurringRules: [],
    transfers: [],
    importJobs: [],
  }
}
