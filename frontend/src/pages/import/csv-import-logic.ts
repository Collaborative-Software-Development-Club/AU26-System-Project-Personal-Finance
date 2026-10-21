/**
 * Pure helpers for the CSV import wizard: file checks, parsing (papaparse),
 * header auto-detection, column mapping, row validation and in-file duplicate
 * detection. No React in here so the rules can be unit-tested in isolation.
 *
 * Scope reminder: everything here is *client-side pre-validation*. Duplicate
 * detection only looks inside the current file; cross-import duplicate policy,
 * atomic insertion and retry safety belong to the backend.
 */
import Papa from 'papaparse'
import {
  CSV_ACCEPTED_TYPES,
  CSV_MAX_FILE_BYTES,
  DESCRIPTION_MAX_LENGTH,
  isValidISODate,
  parseMoney,
  sumMoney,
  type Account,
  type Category,
  type CurrencyCode,
  type Id,
  type ISODate,
  type MinorUnits,
  type TransactionType,
} from '@/domain'
import type { useFinanceStore } from '@/store/finance-store'

// ---------------------------------------------------------------------------
// Types derived from the store contract (pages never import `@/api`).
// ---------------------------------------------------------------------------

type RunImport = ReturnType<typeof useFinanceStore.getState>['runImport']
export type ImportInput = Parameters<RunImport>[0]
export type ImportRowInput = ImportInput['rows'][number]
export type ImportRowIssue = ImportInput['invalidRows'][number]

// ---------------------------------------------------------------------------
// File checks
// ---------------------------------------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const mb = bytes / (1024 * 1024)
  return `${Math.round(mb * 10) / 10} MB`
}

export function isCsvFile(file: File): boolean {
  return /\.csv$/i.test(file.name) || CSV_ACCEPTED_TYPES.includes(file.type)
}

/** Returns an error message or null when the file may be parsed. */
export function validateCsvFile(file: File): string | null {
  if (!isCsvFile(file)) return 'Only CSV files (.csv) are supported.'
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > CSV_MAX_FILE_BYTES) {
    return `The file is ${formatFileSize(file.size)}; the maximum is ${formatFileSize(CSV_MAX_FILE_BYTES)}.`
  }
  return null
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type CsvRow = Record<string, string>

export interface ParsedCsv {
  fileName: string
  fileSize: number
  headers: string[]
  rows: CsvRow[]
  /** Non-fatal parser messages (quotes, field count mismatches…). */
  parseErrors: string[]
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = [...new Set((results.meta.fields ?? []).filter((h) => h !== ''))]
        const parseErrors = results.errors.slice(0, 20).map((e) => {
          const where = typeof e.row === 'number' ? `Row ${e.row + 1}: ` : ''
          return `${where}${e.message}`
        })
        if (results.errors.length > 20) parseErrors.push(`…and ${results.errors.length - 20} more parser messages.`)
        resolve({
          fileName: file.name,
          fileSize: file.size,
          headers,
          rows: results.data,
          parseErrors,
        })
      },
      error: (err) => reject(new Error(err.message || 'The file could not be read.')),
    })
  })
}

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------

export type ImportField = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'type' | 'category' | 'account' | 'notes'

/** How the amount and direction are expressed in the file. */
export type AmountMode = 'signed' | 'debitCredit'
/** For a single signed amount column without a type column. */
export type SignConvention = 'negativeIsExpense' | 'negativeIsIncome'
export type CsvDateFormat = 'iso' | 'mdy' | 'dmy'

/** field → CSV header ('' = not mapped). */
export type ColumnMapping = Record<ImportField, string>

export interface MappingConfig {
  mapping: ColumnMapping
  amountMode: AmountMode
  signConvention: SignConvention
  dateFormat: CsvDateFormat
}

export const EMPTY_MAPPING: ColumnMapping = {
  date: '',
  description: '',
  amount: '',
  debit: '',
  credit: '',
  type: '',
  category: '',
  account: '',
  notes: '',
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  mapping: EMPTY_MAPPING,
  amountMode: 'signed',
  signConvention: 'negativeIsExpense',
  dateFormat: 'iso',
}

export const CSV_DATE_FORMAT_OPTIONS: { value: CsvDateFormat; label: string; example: string }[] = [
  { value: 'iso', label: 'ISO (YYYY-MM-DD)', example: '2026-01-05' },
  { value: 'mdy', label: 'US (MM/DD/YYYY)', example: '01/05/2026' },
  { value: 'dmy', label: 'European (DD/MM/YYYY)', example: '05/01/2026' },
]

export const FIELD_LABEL: Record<ImportField, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  debit: 'Debit (money out)',
  credit: 'Credit (money in)',
  type: 'Type',
  category: 'Category',
  account: 'Account',
  notes: 'Notes',
}

const HEADER_SYNONYMS: Record<ImportField, string[]> = {
  date: ['date', 'transaction date', 'posted date', 'posting date', 'trans date', 'value date', 'booking date'],
  description: ['description', 'memo', 'payee', 'narrative', 'details', 'merchant', 'name', 'transaction', 'particulars'],
  amount: ['amount', 'value', 'sum', 'total', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'outflow', 'debit amount'],
  credit: ['credit', 'deposit', 'deposits', 'money in', 'paid in', 'inflow', 'credit amount'],
  type: ['type', 'transaction type', 'direction', 'kind', 'dr/cr', 'cr/dr'],
  category: ['category', 'categories', 'tag'],
  account: ['account', 'account name', 'source account'],
  notes: ['notes', 'note', 'comment', 'comments', 'reference', 'ref'],
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ')
}

/** Guess a mapping from header names. Each header is used at most once. */
export function autoDetectMapping(headers: string[]): MappingConfig {
  const mapping: ColumnMapping = { ...EMPTY_MAPPING }
  const used = new Set<string>()
  const order: ImportField[] = ['date', 'description', 'amount', 'debit', 'credit', 'type', 'category', 'account', 'notes']
  for (const field of order) {
    const synonyms = HEADER_SYNONYMS[field]
    // exact match first, then "contains"
    const exact = headers.find((h) => !used.has(h) && synonyms.includes(normaliseHeader(h)))
    const loose =
      exact ??
      headers.find((h) => {
        if (used.has(h)) return false
        const n = normaliseHeader(h)
        return synonyms.some((s) => n.includes(s))
      })
    if (loose) {
      mapping[field] = loose
      used.add(loose)
    }
  }
  // Prefer debit/credit mode when both columns were found and no single amount column was.
  const amountMode: AmountMode = !mapping.amount && mapping.debit && mapping.credit ? 'debitCredit' : 'signed'
  return { ...DEFAULT_MAPPING_CONFIG, mapping, amountMode }
}

export type MappingErrors = Partial<Record<ImportField | 'defaultAccount', string>>

export function validateMapping(config: MappingConfig, defaultAccountId: Id | ''): MappingErrors {
  const errors: MappingErrors = {}
  const { mapping, amountMode } = config
  if (!mapping.date) errors.date = 'Choose the column that holds the transaction date.'
  if (!mapping.description) errors.description = 'Choose the column that holds the description.'
  if (amountMode === 'signed') {
    if (!mapping.amount) errors.amount = 'Choose the amount column.'
  } else {
    if (!mapping.debit) errors.debit = 'Choose the debit (money out) column.'
    if (!mapping.credit) errors.credit = 'Choose the credit (money in) column.'
    if (mapping.debit && mapping.credit && mapping.debit === mapping.credit) {
      errors.credit = 'Debit and credit must be different columns.'
    }
  }
  if (!mapping.account && !defaultAccountId) {
    errors.defaultAccount = 'Select a default account, or map an account column.'
  }
  return errors
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

const ISO_PREFIX_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/
const SLASH_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/
const SLASH_RE_SHORT_YEAR = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/

function pad2(n: string): string {
  return n.padStart(2, '0')
}

/** Parse a date cell into an ISO date according to the chosen format, or null. */
export function parseCsvDate(raw: string, format: CsvDateFormat): ISODate | null {
  const value = raw.trim()
  if (!value) return null
  let iso: string | null = null
  if (format === 'iso') {
    const m = ISO_PREFIX_RE.exec(value)
    if (m) iso = `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`
  } else {
    const m = SLASH_RE.exec(value) ?? SLASH_RE_SHORT_YEAR.exec(value)
    if (m) {
      const year = m[3].length === 2 ? `20${m[3]}` : m[3]
      const [a, b] = [pad2(m[1]), pad2(m[2])]
      iso = format === 'mdy' ? `${year}-${a}-${b}` : `${year}-${b}-${a}`
    }
  }
  return iso && isValidISODate(iso) ? iso : null
}

/**
 * Parse an amount cell into *signed* minor units. Handles currency symbols,
 * thousands separators, parentheses negatives, trailing minus and a European
 * decimal comma when it clearly follows a thousands dot (e.g. "1.234,56").
 */
export function parseCsvAmount(raw: string, currency: CurrencyCode): MinorUnits | null {
  let s = raw.trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (/-\s*$/.test(s)) {
    negative = true
    s = s.replace(/-\s*$/, '')
  }
  // Keep only digits, separators and leading sign characters.
  s = s.replace(/[^\d.,\-+]/g, '')
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastComma > lastDot) {
    // Comma is the decimal separator → normalise to a dot.
    s = s.replace(/\./g, '').replace(/,/g, (_ch, offset: number) => (offset === lastComma ? '.' : ''))
  }
  const parsed = parseMoney(s, currency)
  if (parsed === null) return null
  return negative ? -Math.abs(parsed) : parsed
}

type RowType = Exclude<TransactionType, 'transfer'>

const INCOME_WORDS = ['income', 'credit', 'cr', 'deposit', 'in', 'inflow', 'received', 'refund']
const EXPENSE_WORDS = ['expense', 'debit', 'dr', 'withdrawal', 'out', 'outflow', 'payment', 'purchase', 'spent', 'charge']

export function parseCsvType(raw: string): RowType | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (INCOME_WORDS.includes(v)) return 'income'
  if (EXPENSE_WORDS.includes(v)) return 'expense'
  return null
}

// ---------------------------------------------------------------------------
// Row validation + duplicates
// ---------------------------------------------------------------------------

export interface PreparedRow extends ImportRowInput {
  /** Row number of the earlier identical row in this file, when flagged. */
  duplicateOf: number | null
  /** Non-blocking notes (e.g. unmatched category). */
  warnings: string[]
}

export interface ValidationContext {
  accounts: Account[]
  categories: Category[]
  defaultAccountId: Id | ''
}

export interface ValidationResult {
  valid: PreparedRow[]
  invalid: ImportRowIssue[]
  /** Row numbers flagged as in-file duplicates (subset of `valid`). */
  duplicateRows: number[]
  warnings: ImportRowIssue[]
  totalRows: number
}

function cell(row: CsvRow, header: string): string {
  if (!header) return ''
  const v = row[header]
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

export function validateRows(parsed: ParsedCsv, config: MappingConfig, ctx: ValidationContext): ValidationResult {
  const { mapping, amountMode, signConvention, dateFormat } = config
  const activeAccounts = ctx.accounts.filter((a) => a.status === 'active')
  const accountByName = new Map(activeAccounts.map((a) => [a.name.trim().toLowerCase(), a]))
  const accountById = new Map(activeAccounts.map((a) => [a.id, a]))
  const categoryByName = new Map(
    ctx.categories.filter((c) => c.status === 'active').map((c) => [c.name.trim().toLowerCase(), c]),
  )
  const defaultAccount = ctx.defaultAccountId ? accountById.get(ctx.defaultAccountId) ?? null : null

  const valid: PreparedRow[] = []
  const invalid: ImportRowIssue[] = []
  const warnings: ImportRowIssue[] = []
  const seen = new Map<string, number>()
  const duplicateRows: number[] = []

  parsed.rows.forEach((raw, index) => {
    const rowNo = index + 1
    const rowWarnings: string[] = []
    const fail = (field: string | null, message: string) => invalid.push({ row: rowNo, field, message })

    // Account first — it decides the currency used to parse the amount.
    let account: Account | null = defaultAccount
    const accountText = cell(raw, mapping.account).trim()
    if (mapping.account && accountText) {
      const match = accountByName.get(accountText.toLowerCase())
      if (match) account = match
      else if (defaultAccount) rowWarnings.push(`Account "${accountText}" not found; using ${defaultAccount.name}.`)
      else {
        fail('account', `Account "${accountText}" does not match any active account.`)
        return
      }
    }
    if (!account) {
      fail('account', 'No account for this row and no default account selected.')
      return
    }

    // Date
    const dateText = cell(raw, mapping.date)
    const date = parseCsvDate(dateText, dateFormat)
    if (!date) {
      fail('date', dateText.trim() ? `Invalid date "${dateText.trim()}".` : 'Date is missing.')
      return
    }

    // Description
    const description = cell(raw, mapping.description).trim()
    if (!description) {
      fail('description', 'Description is missing.')
      return
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      fail('description', `Description is longer than ${DESCRIPTION_MAX_LENGTH} characters.`)
      return
    }

    // Amount + type
    let amount: MinorUnits
    let type: RowType
    if (amountMode === 'debitCredit') {
      const debitText = cell(raw, mapping.debit).trim()
      const creditText = cell(raw, mapping.credit).trim()
      const debit = debitText ? parseCsvAmount(debitText, account.currency) : null
      const credit = creditText ? parseCsvAmount(creditText, account.currency) : null
      if (debitText && debit === null) {
        fail('debit', `Invalid debit amount "${debitText}".`)
        return
      }
      if (creditText && credit === null) {
        fail('credit', `Invalid credit amount "${creditText}".`)
        return
      }
      const hasDebit = debit !== null && debit !== 0
      const hasCredit = credit !== null && credit !== 0
      if (hasDebit && hasCredit) {
        fail('amount', 'Row has both a debit and a credit amount.')
        return
      }
      if (!hasDebit && !hasCredit) {
        fail('amount', 'Row has neither a debit nor a credit amount.')
        return
      }
      amount = Math.abs(hasDebit ? debit! : credit!)
      type = hasDebit ? 'expense' : 'income'
    } else {
      const amountText = cell(raw, mapping.amount).trim()
      const signed = parseCsvAmount(amountText, account.currency)
      if (signed === null) {
        fail('amount', amountText ? `Invalid amount "${amountText}".` : 'Amount is missing.')
        return
      }
      if (signed === 0) {
        fail('amount', 'Amount must be greater than zero.')
        return
      }
      amount = Math.abs(signed)
      const typeText = cell(raw, mapping.type)
      const explicit = mapping.type ? parseCsvType(typeText) : null
      if (mapping.type && typeText.trim() && !explicit) {
        fail('type', `Unrecognised type "${typeText.trim()}". Use income/expense, credit/debit or deposit/withdrawal.`)
        return
      }
      if (explicit) type = explicit
      else {
        const negativeIsExpense = signConvention === 'negativeIsExpense'
        type = signed < 0 ? (negativeIsExpense ? 'expense' : 'income') : negativeIsExpense ? 'income' : 'expense'
      }
    }

    // Category (optional, soft-matched)
    let categoryId: Id | null = null
    const categoryText = cell(raw, mapping.category).trim()
    if (mapping.category && categoryText) {
      const match = categoryByName.get(categoryText.toLowerCase())
      if (!match) rowWarnings.push(`Category "${categoryText}" not found; left uncategorised.`)
      else if (match.type !== 'both' && match.type !== type) {
        rowWarnings.push(`Category "${match.name}" is for ${match.type} transactions; left uncategorised.`)
      } else categoryId = match.id
    }

    const notesText = cell(raw, mapping.notes).trim()
    const notes = notesText ? notesText.slice(0, DESCRIPTION_MAX_LENGTH) : null

    // In-file duplicate detection: same date + amount + description (case-insensitive).
    const key = `${date}|${amount}|${description.toLowerCase()}`
    const firstRow = seen.get(key)
    let duplicateOf: number | null = null
    if (firstRow !== undefined) {
      duplicateOf = firstRow
      duplicateRows.push(rowNo)
    } else {
      seen.set(key, rowNo)
    }

    for (const w of rowWarnings) warnings.push({ row: rowNo, field: null, message: w })

    valid.push({
      row: rowNo,
      date,
      description,
      amount,
      type,
      accountId: account.id,
      categoryId,
      notes,
      duplicateOf,
      warnings: rowWarnings,
    })
  })

  return { valid, invalid, duplicateRows, warnings, totalRows: parsed.rows.length }
}

// ---------------------------------------------------------------------------
// Building the request
// ---------------------------------------------------------------------------

export interface ImportPlan {
  input: ImportInput
  /** Rows that will actually be sent. */
  rows: ImportRowInput[]
  skippedDuplicates: number
  totals: ImportTotals[]
}

export interface ImportTotals {
  currency: CurrencyCode
  accountIds: Id[]
  income: MinorUnits
  expense: MinorUnits
  count: number
}

export function buildImportPlan(
  result: ValidationResult,
  options: { fileName: string; defaultAccountId: Id | ''; skipDuplicates: boolean; accounts: Account[] },
): ImportPlan {
  const selected = options.skipDuplicates ? result.valid.filter((r) => r.duplicateOf === null) : result.valid
  const skippedDuplicates = result.valid.length - selected.length
  const rows: ImportRowInput[] = selected.map(({ row, date, description, amount, type, accountId, categoryId, notes }) => ({
    row,
    date,
    description,
    amount,
    type,
    accountId,
    categoryId,
    notes,
  }))
  const currencyOf = new Map(options.accounts.map((a) => [a.id, a.currency]))
  const byCurrency = new Map<CurrencyCode, { accountIds: Set<Id>; income: MinorUnits[]; expense: MinorUnits[] }>()
  for (const r of rows) {
    const currency = currencyOf.get(r.accountId) ?? 'USD'
    let bucket = byCurrency.get(currency)
    if (!bucket) {
      bucket = { accountIds: new Set(), income: [], expense: [] }
      byCurrency.set(currency, bucket)
    }
    bucket.accountIds.add(r.accountId)
    if (r.type === 'income') bucket.income.push(r.amount)
    else bucket.expense.push(r.amount)
  }
  const totals: ImportTotals[] = [...byCurrency.entries()].map(([currency, b]) => ({
    currency,
    accountIds: [...b.accountIds],
    income: sumMoney(b.income),
    expense: sumMoney(b.expense),
    count: b.income.length + b.expense.length,
  }))
  return {
    input: {
      fileName: options.fileName,
      accountId: options.defaultAccountId || null,
      rows,
      skippedRows: skippedDuplicates,
      invalidRows: result.invalid,
    },
    rows,
    skippedDuplicates,
    totals,
  }
}

export function importSummaryText(count: number, fileName: string): string {
  return `Import ${count} transaction${count === 1 ? '' : 's'} from ${fileName}`
}
