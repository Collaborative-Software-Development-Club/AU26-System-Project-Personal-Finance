import { useId, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Info, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/financial'
import { useFormatters } from '@/hooks'
import type { Account } from '@/domain'
import { cn } from '@/lib/utils'
import { FIELD_LABEL, type ImportField, type ImportRowIssue, type ValidationResult } from './csv-import-logic'

export interface ImportValidationSummaryProps {
  result: ValidationResult
  skipDuplicates: boolean
  onSkipDuplicatesChange(next: boolean): void
  accounts: Account[]
}

const ISSUE_PAGE = 50

/** Counts, row-level problems and the in-file duplicate toggle. */
export function ImportValidationSummary({ result, skipDuplicates, onSkipDuplicatesChange, accounts }: ImportValidationSummaryProps) {
  const checkboxId = useId()
  const fmt = useFormatters()
  const duplicates = result.valid.filter((r) => r.duplicateOf !== null)
  const cleanValid = result.valid.length - duplicates.length
  const accountById = new Map(accounts.map((a) => [a.id, a]))

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat icon={CheckCircle2} tone="success" label="Valid rows" value={result.valid.length} hint={`${cleanValid} unique`} />
        <Stat icon={XCircle} tone="expense" label="Invalid rows" value={result.invalid.length} hint="Reported, not imported" />
        <Stat icon={Copy} tone="warning" label="Possible duplicates" value={duplicates.length} hint="Within this file only" />
      </dl>

      {result.totalRows === 0 && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>No data rows</AlertTitle>
          <AlertDescription>The file contains headers but no rows to import.</AlertDescription>
        </Alert>
      )}

      {result.valid.length === 0 && result.totalRows > 0 && (
        <Alert variant="destructive">
          <XCircle aria-hidden="true" />
          <AlertTitle>Nothing can be imported yet</AlertTitle>
          <AlertDescription>Every row failed validation. Check the column mapping and date format, then try again.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id={checkboxId}
            checked={skipDuplicates}
            onCheckedChange={(v) => onSkipDuplicatesChange(v === true)}
            disabled={duplicates.length === 0}
            className="mt-0.5"
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor={checkboxId} className="font-medium">
              Skip flagged duplicates ({duplicates.length})
            </Label>
            <p className="text-xs text-muted-foreground">
              A row is flagged when an earlier row in <strong>this file</strong> has the same date, amount and description (case-insensitive). The first
              occurrence is always kept.
            </p>
          </div>
        </div>
        <Alert className="border-warning/40 bg-warning/5 [&>svg]:text-warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Duplicate detection is limited to this file</AlertTitle>
          <AlertDescription>
            The browser cannot see transactions imported earlier, in other files or from other sessions. Cross-import duplicate detection and safe
            retries are backend responsibilities; nothing here guarantees a row was not imported before.
          </AlertDescription>
        </Alert>
      </div>

      {duplicates.length > 0 && (
        <IssueSection title={`Flagged duplicates (${duplicates.length})`} defaultOpen={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Row</TableHead>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col">Description</TableHead>
                <TableHead scope="col" className="text-right">
                  Amount
                </TableHead>
                <TableHead scope="col">Same as row</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicates.slice(0, ISSUE_PAGE).map((r) => (
                <TableRow key={r.row}>
                  <TableCell className="tabular">{r.row}</TableCell>
                  <TableCell className="tabular">{fmt.date(r.date)}</TableCell>
                  <TableCell className="max-w-72 truncate" title={r.description}>
                    {r.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay amount={r.amount} currency={accountById.get(r.accountId)?.currency} variant="type" type={r.type} size="sm" />
                  </TableCell>
                  <TableCell className="tabular">{r.duplicateOf}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {duplicates.length > ISSUE_PAGE && <MoreNote shown={ISSUE_PAGE} total={duplicates.length} />}
        </IssueSection>
      )}

      {result.invalid.length > 0 && (
        <IssueSection title={`Invalid rows (${result.invalid.length})`} defaultOpen>
          <IssueTable issues={result.invalid} />
        </IssueSection>
      )}

      {result.warnings.length > 0 && (
        <IssueSection title={`Warnings (${result.warnings.length})`} defaultOpen={false} description="These rows will still be imported.">
          <IssueTable issues={result.warnings} />
        </IssueSection>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: typeof CheckCircle2
  tone: 'success' | 'expense' | 'warning'
  label: string
  value: number
  hint: string
}) {
  const toneClass = { success: 'text-success', expense: 'text-expense', warning: 'text-warning' }[tone]
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className={cn('size-4', toneClass)} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

function IssueSection({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string
  description?: string
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="rounded-xl border">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Show'}
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </Button>
      </div>
      {open && (
        <div id={id} className="border-t">
          {children}
        </div>
      )}
    </section>
  )
}

function IssueTable({ issues }: { issues: ImportRowIssue[] }) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-20">
              Row
            </TableHead>
            <TableHead scope="col" className="w-40">
              Field
            </TableHead>
            <TableHead scope="col">Problem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.slice(0, ISSUE_PAGE).map((issue, i) => (
            <TableRow key={`${issue.row}-${i}`}>
              <TableCell className="tabular">{issue.row}</TableCell>
              <TableCell className="text-muted-foreground">{issue.field ? FIELD_LABEL[issue.field as ImportField] ?? issue.field : '—'}</TableCell>
              <TableCell className="whitespace-normal">{issue.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {issues.length > ISSUE_PAGE && <MoreNote shown={ISSUE_PAGE} total={issues.length} />}
    </>
  )
}

function MoreNote({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="border-t px-4 py-2 text-xs text-muted-foreground">
      Showing the first {shown} of {total}.
    </p>
  )
}
