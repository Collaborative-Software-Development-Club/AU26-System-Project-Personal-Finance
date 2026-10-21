/**
 * Money helpers.
 *
 * All arithmetic happens on integer minor units (cents). Never do financial
 * math on parsed floats — parse strings digit-by-digit into integers and only
 * convert to a JS number for *display* via Intl.NumberFormat.
 */
import type { CurrencyCode, MinorUnits } from './types'

export interface CurrencyInfo {
  code: CurrencyCode
  name: string
  symbol: string
  /** Number of minor-unit digits (2 for USD, 0 for JPY). */
  decimals: number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
}

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[]

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES
}

export function currencyDecimals(currency: CurrencyCode): number {
  return CURRENCIES[currency]?.decimals ?? 2
}

/**
 * Parse a user-entered decimal string ("1,234.56", "$12", "-3.5") into integer
 * minor units. Returns null if the input is not a valid monetary value or has
 * more fractional digits than the currency allows.
 */
export function parseMoney(input: string, currency: CurrencyCode): MinorUnits | null {
  const decimals = currencyDecimals(currency)
  let s = input.trim()
  if (s === '') return null
  // Strip currency symbols, spaces and thousands separators.
  s = s.replace(/[\s,]/g, '').replace(/^[^\d\-+.]+/, '')
  let negative = false
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null
  const [wholeRaw, fracRaw = ''] = s.split('.')
  const whole = wholeRaw === '' ? '0' : wholeRaw
  if (fracRaw.length > decimals) return null
  const frac = fracRaw.padEnd(decimals, '0')
  const digits = `${whole}${frac}`.replace(/^0+(?=\d)/, '')
  if (digits.length > 15) return null // keep well inside Number.MAX_SAFE_INTEGER
  const value = Number(digits)
  if (!Number.isSafeInteger(value)) return null
  return negative ? -value : value
}

/** Minor units → plain decimal string without grouping ("1234.56"). */
export function toDecimalString(amount: MinorUnits, currency: CurrencyCode): string {
  const decimals = currencyDecimals(currency)
  const negative = amount < 0
  const abs = Math.abs(Math.trunc(amount)).toString().padStart(decimals + 1, '0')
  const whole = decimals === 0 ? abs : abs.slice(0, -decimals)
  const frac = decimals === 0 ? '' : `.${abs.slice(-decimals)}`
  return `${negative ? '-' : ''}${whole}${frac}`
}

export interface FormatMoneyOptions {
  locale?: string
  /** 'auto' shows "-" for negatives only; 'always' adds "+" for positives; 'never' hides the sign. */
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero'
  /** Hide fractional digits (used for compact dashboard tiles). */
  compact?: boolean
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: CurrencyCode, locale: string, signDisplay: string, compact: boolean) {
  const key = `${locale}|${currency}|${signDisplay}|${compact}`
  let f = formatterCache.get(key)
  if (!f) {
    const decimals = currencyDecimals(currency)
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      signDisplay: signDisplay as Intl.NumberFormatOptions['signDisplay'],
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 0 : decimals,
    })
    formatterCache.set(key, f)
  }
  return f
}

/** Format minor units for display. Conversion to a float happens only here. */
export function formatMoney(
  amount: MinorUnits,
  currency: CurrencyCode,
  { locale = 'en-US', signDisplay = 'auto', compact = false }: FormatMoneyOptions = {},
): string {
  const decimals = currencyDecimals(currency)
  const major = amount / 10 ** decimals
  return getFormatter(currency, locale, signDisplay, compact).format(major)
}

export function sumMoney(amounts: Iterable<MinorUnits>): MinorUnits {
  let total = 0
  for (const a of amounts) total += a
  return total
}

/** Integer percentage helper. Returns 0 when `whole` is 0. */
export function percentOf(part: MinorUnits, whole: MinorUnits): number {
  if (whole === 0) return 0
  return (part / whole) * 100
}

/** Multiply minor units by a factor and round half away from zero. */
export function multiplyMoney(amount: MinorUnits, factor: number): MinorUnits {
  const raw = amount * factor
  return Math.sign(raw) * Math.round(Math.abs(raw))
}

/** Percentage change from `previous` to `current`; null when previous is 0. */
export function percentChange(current: MinorUnits, previous: MinorUnits): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
