import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  formatDateTime,
  formatISODate,
  formatMoney,
  formatMonthKey,
  type CurrencyCode,
  type FormatMoneyOptions,
  type ISODate,
  type MinorUnits,
  type MonthKey,
} from '@/domain'
import { useSettingsStore } from '@/store/settings-store'

export interface Formatters {
  /** Format minor units with the account's currency (falls back to the default currency). */
  money(amount: MinorUnits, currency?: CurrencyCode | null, options?: Omit<FormatMoneyOptions, 'locale'>): string
  /** Signed money: "+$12.00" / "-$12.00". */
  signedMoney(amount: MinorUnits, currency?: CurrencyCode | null): string
  date(iso: ISODate): string
  dateTime(iso: string): string
  month(month: MonthKey, style?: 'long' | 'short'): string
  percent(value: number, digits?: number): string
  number(value: number): string
  defaultCurrency: CurrencyCode
}

/** Settings-aware formatters. Use this instead of calling format* directly in components. */
export function useFormatters(): Formatters {
  const { defaultCurrency, dateFormat, numberLocale } = useSettingsStore(
    useShallow((s) => ({
      defaultCurrency: s.defaultCurrency,
      dateFormat: s.dateFormat,
      numberLocale: s.numberLocale,
    })),
  )
  return useMemo<Formatters>(() => {
    const numberFormatter = new Intl.NumberFormat(numberLocale)
    return {
      defaultCurrency,
      money: (amount, currency, options) =>
        formatMoney(amount, currency ?? defaultCurrency, { locale: numberLocale, ...options }),
      signedMoney: (amount, currency) =>
        formatMoney(amount, currency ?? defaultCurrency, { locale: numberLocale, signDisplay: 'exceptZero' }),
      date: (iso) => formatISODate(iso, dateFormat),
      dateTime: (iso) => formatDateTime(iso, dateFormat),
      month: (month, style) => formatMonthKey(month, style),
      percent: (value, digits = 0) => `${value.toFixed(digits)}%`,
      number: (value) => numberFormatter.format(value),
    }
  }, [defaultCurrency, dateFormat, numberLocale])
}
