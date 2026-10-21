import { Link } from 'react-router'
import { ArrowLeft, CheckCircle2, CircleHelp, Clock, History, ListOrdered, RefreshCw, Upload, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ImportStatusBadge } from '@/components/financial'
import { ErrorState, OutcomeUnknownNotice } from '@/components/feedback'
import { useFormatters } from '@/hooks'
import type { ImportJob } from '@/domain'
import { cn } from '@/lib/utils'

export type ImportOutcome =
  | { kind: 'job'; job: ImportJob }
  | { kind: 'unknown'; summary: string }
  | { kind: 'error'; message: string }

export interface ImportResultSummaryProps {
  outcome: ImportOutcome
  onImportAnother(): void
  onBackToReview(): void
  onRetry(): void
  retrying?: boolean
}

/** Final wizard step. Mirrors exactly what the (mock) server reported — never more. */
export function ImportResultSummary({ outcome, onImportAnother, onBackToReview, onRetry, retrying = false }: ImportResultSummaryProps) {
  if (outcome.kind === 'unknown') {
    return (
      <div className="flex flex-col gap-4">
        <OutcomeUnknownNotice
          title="Import outcome unknown"
          description={`"${outcome.summary}" was sent, but no confirmation came back. Some, all or none of the rows may have been saved. Do not re-upload the file yet — the "Outcome unknown" banner at the top of the app lets you check the status and will add the imported transactions once the server confirms them.`}
        />
        <p className="text-sm text-muted-foreground">
          When the backend exists, this page will reconcile using the server's import status and row counts rather than assuming anything.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/import/history">
              <History aria-hidden="true" />
              Import history
            </Link>
          </Button>
          <Button variant="outline" onClick={onImportAnother}>
            <Upload aria-hidden="true" />
            Start a new import
          </Button>
        </div>
      </div>
    )
  }

  if (outcome.kind === 'error') {
    return (
      <ErrorState
        title="Import did not complete"
        description={`${outcome.message} Nothing from this file was saved. Your mapping and file are still here, so you can go back and try again.`}
        onRetry={onRetry}
        retryLabel={retrying ? 'Retrying…' : 'Try again'}
        action={
          <Button variant="ghost" onClick={onBackToReview} disabled={retrying}>
            <ArrowLeft aria-hidden="true" />
            Back to review
          </Button>
        }
      />
    )
  }

  const { job } = outcome
  return <JobResult job={job} onImportAnother={onImportAnother} />
}

function JobResult({ job, onImportAnother }: { job: ImportJob; onImportAnother(): void }) {
  const fmt = useFormatters()
  const headline =
    job.status === 'completed'
      ? 'Import completed'
      : job.status === 'partial'
        ? 'Import partially completed'
        : job.status === 'failed'
          ? 'Import failed'
          : 'Import outcome unknown'
  const Icon = job.status === 'completed' ? CheckCircle2 : job.status === 'partial' ? Clock : job.status === 'failed' ? XCircle : CircleHelp
  const tone =
    job.status === 'completed' ? 'text-success' : job.status === 'failed' ? 'text-expense' : 'text-warning'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <Icon className={cn('size-10', tone)} aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{headline}</h2>
          <p className="text-sm text-muted-foreground">
            {job.fileName} · {fmt.dateTime(job.createdAt)}
          </p>
        </div>
        <ImportStatusBadge status={job.status} />
        <p className="max-w-md text-xs text-muted-foreground">
          These counts come from the simulated import and are stored in this browser only. A real import would report server-side results here.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-4">
        <Count label="Rows in file" value={job.totalRows} />
        <Count label="Imported" value={job.successfulRows} tone="text-success" />
        <Count label="Skipped" value={job.skippedRows} />
        <Count label="Failed" value={job.failedRows} tone={job.failedRows > 0 ? 'text-expense' : undefined} />
      </dl>

      {job.errors.length > 0 && (
        <section className="rounded-xl border">
          <h3 className="px-4 py-3 text-sm font-semibold">Rows that were not imported ({job.errors.length})</h3>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-20">
                    Row
                  </TableHead>
                  <TableHead scope="col" className="w-36">
                    Field
                  </TableHead>
                  <TableHead scope="col">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.errors.slice(0, 100).map((e, i) => (
                  <TableRow key={`${e.row}-${i}`}>
                    <TableCell className="tabular">{e.row}</TableCell>
                    <TableCell className="text-muted-foreground">{e.field ?? '—'}</TableCell>
                    <TableCell className="whitespace-normal">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {job.errors.length > 100 && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Showing the first 100 of {job.errors.length}.</p>}
          </div>
        </section>
      )}

      {job.status === 'partial' && (
        <Alert className="border-warning/40 bg-warning/5 [&>svg]:text-warning">
          <Clock aria-hidden="true" />
          <AlertTitle>Some rows were imported, some were not</AlertTitle>
          <AlertDescription>
            {job.successfulRows} transaction{job.successfulRows === 1 ? ' was' : 's were'} saved. Fix the rows listed above in your file and import only
            those again to avoid duplicating the rest.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/transactions">
            <ListOrdered aria-hidden="true" />
            View transactions
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/import/history">
            <History aria-hidden="true" />
            Import history
          </Link>
        </Button>
        <Button variant="outline" onClick={onImportAnother}>
          <RefreshCw aria-hidden="true" />
          Import another file
        </Button>
      </div>
    </div>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('text-2xl font-semibold tabular', tone)}>{value}</dd>
    </div>
  )
}
