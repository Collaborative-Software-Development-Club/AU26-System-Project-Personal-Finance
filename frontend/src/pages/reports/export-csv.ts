/**
 * Frontend-only CSV export for the Reports page.
 *
 * Serialises the *displayed* table rows (never raw transactions) following
 * RFC 4180: fields containing a comma, double quote, CR or LF are wrapped in
 * double quotes and internal quotes are doubled. Lines end with CRLF.
 */
import type { DateRange } from '@/domain'

const NEEDS_QUOTING = /[",\r\n]/

export function escapeCsvField(value: string): string {
  if (!NEEDS_QUOTING.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function toCsvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(',')
}

/** Build a CSV document from a header row and data rows. */
export function buildCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map(toCsvLine).join('\r\n') + '\r\n'
}

/** `report-<type>-<start>_<end>.csv` */
export function reportFileName(type: string, range: DateRange): string {
  return `report-${type}-${range.start}_${range.end}.csv`
}

/** Trigger a browser download via Blob + object URL + anchor click. */
export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
