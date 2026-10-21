import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, FileSpreadsheet, ListOrdered, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageContainer, usePageHeader } from '@/components/layout'
import { EmptyState } from '@/components/feedback'
import { ImportStatusBadge } from '@/components/financial'
import { useFormatters } from '@/hooks'
import { useAccountMap, useFinanceStore } from '@/store'
import type { Id, ImportJob } from '@/domain'
import { cn } from '@/lib/utils'

export default function ImportHistoryPage() {
  const importJobs = useFinanceStore((s) => s.importJobs)
  const accountMap = useAccountMap()
  const fmt = useFormatters()
  const [expanded, setExpanded] = useState<Id | null>(null)

  usePageHeader({
    title: 'Import History',
    description: 'Simulated import jobs recorded in this browser. Results reflect the mock server, not a real import.',
    breadcrumbs: [{ label: 'Import', to: '/import' }],
    actions: (
      <Button asChild>
        <Link to="/import">
          <Upload aria-hidden="true" />
          Import CSV
        </Link>
      </Button>
    ),
  })

  const jobs = useMemo(() => [...importJobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)), [importJobs])

  if (jobs.length === 0) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={FileSpreadsheet}
          title="No imports yet"
          description="Imports you run from a CSV file will be listed here with their row counts and any rows that were rejected."
          action={
            <Button asChild>
              <Link to="/import">
                <Upload aria-hidden="true" />
                Import a CSV file
              </Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const toggle = (id: Id) => setExpanded((cur) => (cur === id ? null : id))

  return (
    <PageContainer>
      <Alert>
        <FileSpreadsheet aria-hidden="true" />
        <AlertTitle>Simulated results</AlertTitle>
        <AlertDescription>
          Every job below was processed by the in-browser mock and persists only in this browser&rsquo;s storage. Resetting data in Settings clears
          this list.
        </AlertDescription>
      </Alert>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">File</TableHead>
              <TableHead scope="col">Imported on</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">
                Rows
              </TableHead>
              <TableHead scope="col" className="text-right">
                Imported
              </TableHead>
              <TableHead scope="col" className="text-right">
                Skipped
              </TableHead>
              <TableHead scope="col" className="text-right">
                Failed
              </TableHead>
              <TableHead scope="col" className="w-12">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const open = expanded === job.id
              const detailsId = `import-${job.id}-details`
              return (
                <Fragment key={job.id}>
                  <TableRow>
                    <TableCell className="max-w-64">
                      <span className="block truncate font-medium" title={job.fileName}>
                        {job.fileName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {job.accountId ? accountMap.get(job.accountId)?.name ?? 'Account removed' : 'Per-row accounts'}
                      </span>
                    </TableCell>
                    <TableCell className="tabular">{fmt.dateTime(job.createdAt)}</TableCell>
                    <TableCell>
                      <ImportStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right tabular">{job.totalRows}</TableCell>
                    <TableCell className="text-right tabular">{job.successfulRows}</TableCell>
                    <TableCell className="text-right tabular">{job.skippedRows}</TableCell>
                    <TableCell className={cn('text-right tabular', job.failedRows > 0 && 'text-expense')}>{job.failedRows}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={open}
                        aria-controls={detailsId}
                        aria-label={open ? `Hide details for ${job.fileName}` : `Show details for ${job.fileName}`}
                        onClick={() => toggle(job.id)}
                      >
                        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} id={detailsId} className="whitespace-normal bg-muted/30 p-4">
                        <JobDetails job={job} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  )
}

function JobDetails({ job }: { job: ImportJob }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/transactions">
            <ListOrdered aria-hidden="true" />
            View transactions
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          Imported transactions are tagged with source &ldquo;CSV import&rdquo;; the transactions list has no per-import filter yet.
        </span>
      </div>

      {job.status === 'unknown' && (
        <p className="text-sm text-muted-foreground">
          The outcome of this job was never confirmed. Use the &ldquo;Outcome unknown&rdquo; banner to check its status before importing the same file
          again.
        </p>
      )}

      {job.errors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No row errors were reported for this job.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <h3 className="px-3 py-2 text-sm font-semibold">
            Row errors ({job.errors.length})
          </h3>
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
            {job.errors.length > 100 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Showing the first 100 of {job.errors.length}.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
