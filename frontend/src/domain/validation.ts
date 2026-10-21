/**
 * Form-level validation. Each validator takes raw form values (strings) and
 * returns a map of field → error message. An empty map means valid.
 *
 * Validators are pure and shared between the create and edit forms so rules
 * never drift.
 */
import { isLiabilityAccountType, NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from './constants'
import { compareMonthKeys, isValidISODate, isValidMonthKey } from './dates'
import { findBudgetConflict } from './budgets'
import { isCurrencyCode, parseMoney } from './money'
import type {
  Account,
  AccountType,
  Budget,
  Category,
  CategoryType,
  CurrencyCode,
  Id,
  RecurrenceFrequency,
  TransactionType,
} from './types'

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export interface AccountFormValues {
  name: string
  type: AccountType | ''
  currency: CurrencyCode | ''
  openingBalance: string
  description: string
  color: string
}

export function validateAccount(values: AccountFormValues): FieldErrors<keyof AccountFormValues> {
  const errors: FieldErrors<keyof AccountFormValues> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Account name is required.'
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`
  if (!values.type) errors.type = 'Select an account type.'
  if (!values.currency || !isCurrencyCode(values.currency)) errors.currency = 'Select a currency.'
  if (values.currency && isCurrencyCode(values.currency)) {
    const amount = parseMoney(values.openingBalance || '0', values.currency)
    if (amount === null) errors.openingBalance = 'Enter a valid amount.'
    else if (amount < 0 && values.type && !isLiabilityAccountType(values.type)) {
      errors.openingBalance = 'Only credit accounts may start with a negative balance.'
    }
  }
  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`
  }
  return errors
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export interface TransactionFormValues {
  type: Exclude<TransactionType, 'transfer'>
  amount: string
  description: string
  accountId: Id | ''
  categoryId: Id | ''
  date: string
  notes: string
}

export function validateTransaction(
  values: TransactionFormValues,
  context: { accounts: Account[]; categories: Category[] },
): FieldErrors<keyof TransactionFormValues> {
  const errors: FieldErrors<keyof TransactionFormValues> = {}
  const account = context.accounts.find((a) => a.id === values.accountId)
  if (!values.accountId || !account) errors.accountId = 'Select an account.'
  const currency = account?.currency ?? 'USD'
  const amount = parseMoney(values.amount, currency)
  if (amount === null) errors.amount = 'Enter a valid amount.'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero.'
  if (!values.description.trim()) errors.description = 'Description is required.'
  else if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`
  }
  const category = context.categories.find((c) => c.id === values.categoryId)
  if (!values.categoryId || !category) errors.categoryId = 'Select a category.'
  else if (category.type !== 'both' && category.type !== values.type) {
    errors.categoryId = `This category is for ${category.type} transactions.`
  }
  if (!isValidISODate(values.date)) errors.date = 'Enter a valid date.'
  return errors
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

export interface TransferFormValues {
  sourceAccountId: Id | ''
  destinationAccountId: Id | ''
  amount: string
  date: string
  description: string
}

export function validateTransfer(
  values: TransferFormValues,
  context: { accounts: Account[] },
): FieldErrors<keyof TransferFormValues> {
  const errors: FieldErrors<keyof TransferFormValues> = {}
  const source = context.accounts.find((a) => a.id === values.sourceAccountId)
  const destination = context.accounts.find((a) => a.id === values.destinationAccountId)
  if (!source) errors.sourceAccountId = 'Select a source account.'
  if (!destination) errors.destinationAccountId = 'Select a destination account.'
  if (source && destination && source.id === destination.id) {
    errors.destinationAccountId = 'Source and destination must be different accounts.'
  }
  if (source && destination && source.currency !== destination.currency) {
    errors.destinationAccountId = 'Cross-currency transfers are not supported yet.'
  }
  const amount = parseMoney(values.amount, source?.currency ?? 'USD')
  if (amount === null) errors.amount = 'Enter a valid amount.'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero.'
  if (!isValidISODate(values.date)) errors.date = 'Enter a valid date.'
  if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Memo must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`
  }
  return errors
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetFormValues {
  name: string
  categoryId: Id | ''
  amount: string
  startMonth: string
  endMonth: string
  warningThreshold: string // percent, e.g. "80"
}

export function validateBudget(
  values: BudgetFormValues,
  context: { categories: Category[]; budgets: Budget[]; currency: CurrencyCode; editingId?: Id | null },
): FieldErrors<keyof BudgetFormValues> {
  const errors: FieldErrors<keyof BudgetFormValues> = {}
  const category = context.categories.find((c) => c.id === values.categoryId)
  if (!category) errors.categoryId = 'Select a category.'
  else if (category.type === 'income') errors.categoryId = 'Budgets can only track expense categories.'
  const amount = parseMoney(values.amount, context.currency)
  if (amount === null) errors.amount = 'Enter a valid amount.'
  else if (amount <= 0) errors.amount = 'Budget amount must be greater than zero.'
  if (!isValidMonthKey(values.startMonth)) errors.startMonth = 'Select a valid start month.'
  if (values.endMonth) {
    if (!isValidMonthKey(values.endMonth)) errors.endMonth = 'Select a valid end month.'
    else if (isValidMonthKey(values.startMonth) && compareMonthKeys(values.endMonth, values.startMonth) < 0) {
      errors.endMonth = 'End month cannot be before the start month.'
    }
  }
  if (values.warningThreshold.trim() !== '') {
    const pct = Number(values.warningThreshold)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      errors.warningThreshold = 'Threshold must be between 1 and 100 percent.'
    }
  }
  if (values.name.trim().length > NAME_MAX_LENGTH) errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`
  if (!errors.categoryId && !errors.startMonth && !errors.endMonth && category) {
    const conflict = findBudgetConflict(context.budgets, {
      id: context.editingId ?? null,
      categoryId: category.id,
      startMonth: values.startMonth,
      endMonth: values.endMonth || null,
    })
    if (conflict) errors.categoryId = 'A budget for this category already covers part of this period.'
  }
  return errors
}

// ---------------------------------------------------------------------------
// Recurring rule
// ---------------------------------------------------------------------------

export interface RecurringFormValues {
  description: string
  type: Exclude<TransactionType, 'transfer'>
  amount: string
  accountId: Id | ''
  categoryId: Id | ''
  frequency: RecurrenceFrequency | ''
  interval: string
  startDate: string
  endDate: string
  notes: string
}

export function validateRecurring(
  values: RecurringFormValues,
  context: { accounts: Account[]; categories: Category[] },
): FieldErrors<keyof RecurringFormValues> {
  const errors: FieldErrors<keyof RecurringFormValues> = {}
  if (!values.description.trim()) errors.description = 'Description is required.'
  const account = context.accounts.find((a) => a.id === values.accountId)
  if (!account) errors.accountId = 'Select an account.'
  const amount = parseMoney(values.amount, account?.currency ?? 'USD')
  if (amount === null) errors.amount = 'Enter a valid amount.'
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero.'
  const category = context.categories.find((c) => c.id === values.categoryId)
  if (!category) errors.categoryId = 'Select a category.'
  else if (category.type !== 'both' && category.type !== values.type) {
    errors.categoryId = `This category is for ${category.type} transactions.`
  }
  if (!values.frequency) errors.frequency = 'Select a frequency.'
  const interval = Number(values.interval)
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) errors.interval = 'Interval must be a whole number from 1 to 365.'
  if (!isValidISODate(values.startDate)) errors.startDate = 'Enter a valid start date.'
  if (values.endDate) {
    if (!isValidISODate(values.endDate)) errors.endDate = 'Enter a valid end date.'
    else if (isValidISODate(values.startDate) && values.endDate < values.startDate) {
      errors.endDate = 'End date cannot be before the start date.'
    }
  }
  return errors
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryFormValues {
  name: string
  type: CategoryType | ''
  color: string
  icon: string
}

export function validateCategory(
  values: CategoryFormValues,
  context: { categories: Category[]; editingId?: Id | null },
): FieldErrors<keyof CategoryFormValues> {
  const errors: FieldErrors<keyof CategoryFormValues> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Category name is required.'
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`
  else {
    // Names are unique case-insensitively.
    const dup = context.categories.find(
      (c) => c.id !== context.editingId && c.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (dup) errors.name = 'A category with this name already exists.'
  }
  if (!values.type) errors.type = 'Select a category type.'
  if (!/^#[0-9a-fA-F]{6}$/.test(values.color)) errors.color = 'Pick a colour.'
  return errors
}

// ---------------------------------------------------------------------------
// Auth (UI only — see demo-user.ts)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface LoginFormValues {
  email: string
  password: string
}

export function validateLogin(values: LoginFormValues): FieldErrors<keyof LoginFormValues> {
  const errors: FieldErrors<keyof LoginFormValues> = {}
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.password) errors.password = 'Password is required.'
  return errors
}

export interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { id: 'number', label: 'Contains a number', test: (p: string) => /\d/.test(p) },
]

export function validateRegister(values: RegisterFormValues): FieldErrors<keyof RegisterFormValues> {
  const errors: FieldErrors<keyof RegisterFormValues> = {}
  if (!values.name.trim()) errors.name = 'Name is required.'
  if (!values.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.password) errors.password = 'Password is required.'
  else if (!PASSWORD_RULES.every((r) => r.test(values.password))) errors.password = 'Password does not meet the requirements.'
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
