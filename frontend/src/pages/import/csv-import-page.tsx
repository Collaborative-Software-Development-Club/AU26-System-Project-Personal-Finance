import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { ArrowLeft, ArrowRight, Check, History, Info, Loader2, Upload, Wallet } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageContainer, PageSection, usePageHeader } from '@/components/layout'
import { EmptyState, PendingOperationIndicator } from '@/components/feedback'
import { AccountSelector, MoneyDisplay } from '@/components/financial'
import { FormField } from '@/components/forms'
import { useAsyncAction } from '@/hooks'
import { useFinanceStore } from '@/store'
import type { Account, Id } from '@/domain'
import { cn } from '@/lib/utils'
import { CsvDropzone } from './csv-dropzone'
import { CsvPreviewTable } from './csv-preview-table'
import { ColumnMapper } from './column-mapper'
import { ImportValidationSummary } from './import-validation-summary'
import { ImportResultSummary, type ImportOutcome } from './import-result-summary'
import {
  autoDetectMapping,
  buildImportPlan,
  DEFAULT_MAPPING_CONFIG,
  importSummaryText,
  parseCsvFile,
  validateCsvFile,
  validateMapping,
  validateRows,
  type ImportInput,
  type ImportPlan,
  type MappingConfig,
  type ParsedCsv,
  type ValidationResult,
} from './csv-import-logic'

// Temporary API upload file spot
import { uploadFile } from '@/api/upload-file'

type Step = 1 | 2 | 3 | 4 | 5 | 6

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Preview' },
  { id: 3, label: 'Map columns' },
  { id: 4, label: 'Validate' },
  { id: 5, label: 'Review' },
  { id: 6, label: 'Result' },
]

export default function CsvImportPage() {
  const { accounts, categories, runImport } = useFinanceStore(
    useShallow((s) => ({ accounts: s.accounts, categories: s.categories, runImport: s.runImport })),
  )
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'active'), [accounts])

  // Wizard state ------------------------------------------------------------
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parsing, setParsing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [defaultAccountId, setDefaultAccountId] = useState<Id | ''>('')
  const [config, setConfig] = useState<MappingConfig>(DEFAULT_MAPPING_CONFIG)
  const [showMappingErrors, setShowMappingErrors] = useState(false)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)

  const importAction = useAsyncAction(async (input: ImportInput, summary: string) => runImport(input, summary))

  usePageHeader({
    title: 'Import Transactions',
    description: 'Upload a CSV statement, map its columns and review the rows before importing them (simulated, stored in this browser).',
    actions: (
      <Button asChild variant="outline">
        <Link to="/import/history">
          <History aria-hidden="true" />
          Import history
        </Link>
      </Button>
    ),
  })

  // Derived -----------------------------------------------------------------
  const mappingErrors = useMemo(() => validateMapping(config, defaultAccountId), [config, defaultAccountId])
  const mappingValid = Object.keys(mappingErrors).length === 0

  const validation = useMemo(
    () => (parsed && mappingValid ? validateRows(parsed, config, { accounts, categories, defaultAccountId }) : null),
    [parsed, mappingValid, config, accounts, categories, defaultAccountId],
  )

  const plan = useMemo(
    () => (validation && parsed ? buildImportPlan(validation, { fileName: parsed.fileName, defaultAccountId, skipDuplicates, accounts }) : null),
    [validation, parsed, defaultAccountId, skipDuplicates, accounts],
  )

  // Handlers ----------------------------------------------------------------
  const onFileSelected = async (picked: File) => {
    const problem = validateCsvFile(picked)

    // Temp call to the API to upload it to the backend
    try {
      const uploadResponse = await uploadFile(picked)
      console.log('Uploaded filename:', uploadResponse.filename)
      console.log('Uploaded content type:', uploadResponse.content_type)
    } catch (error) {
      console.error('Error uploading file:', error)
    }

    setFile(picked)
    setParsed(null)
    setOutcome(null)
    if (problem) {
      setFileError(problem)
      return
    }
    setFileError(null)
    setParsing(true)
    try {
      const result = await parseCsvFile(picked)
      if (result.headers.length === 0) {
        setFileError('No column headers were found. The first row of the file must contain the column names.')
        setParsed(null)
      } else {
        setParsed(result)
        setConfig(autoDetectMapping(result.headers))
        setShowMappingErrors(false)
      }
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'The file could not be read.')
    } finally {
      setParsing(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setFile(null)
    setParsed(null)
    setFileError(null)
    setConfig(DEFAULT_MAPPING_CONFIG)
    setShowMappingErrors(false)
    setSkipDuplicates(true)
    setOutcome(null)
    importAction.reset()
  }

  const onRemoveFile = () => {
    setFile(null)
    setParsed(null)
    setFileError(null)
  }

  const goNext = () => {
    if (step === 1) {
      if (!file) {
        setFileError('Choose a CSV file to continue.')
        return
      }
      if (!parsed) return
      setStep(2)
    } else if (step === 2) setStep(3)
    else if (step === 3) {
      setShowMappingErrors(true)
      if (mappingValid) setStep(4)
    } else if (step === 4) {
      setStep(5)
    }
  }

  const goBack = () => {
    if (step > 1 && step < 6) setStep((step - 1) as Step)
  }

  const submitImport = async () => {
    if (!plan || !parsed) return
    const summary = importSummaryText(plan.rows.length, parsed.fileName)
    const result = await importAction.run(plan.input, summary)
    if (result) setOutcome({ kind: 'job', job: result.job })
    else setOutcome(null) // decided from importAction.status below
    setStep(6)
  }

  const resultOutcome: ImportOutcome | null =
    outcome ??
    (importAction.status === 'unknown' && plan && parsed
      ? { kind: 'unknown', summary: importSummaryText(plan.rows.length, parsed.fileName) }
      : importAction.status === 'error'
        ? { kind: 'error', message: importAction.error ?? 'The import request was rejected.' }
        : null)

  // Empty dataset -----------------------------------------------------------
  if (activeAccounts.length === 0) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          icon={Wallet}
          title="Create an account before importing"
          description="Imported transactions must belong to an account. Add your first account, then come back to import a CSV file."
          action={
            <Button asChild>
              <Link to="/accounts/new">Add account</Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  const canGoNext =
    step === 1 ? !!parsed && !parsing && !fileError : step === 2 ? !!parsed : step === 3 ? true : step === 4 ? !!validation && validation.valid.length > 0 : false

  return (
    <PageContainer>
      <Stepper current={step} />

      {step === 1 && (
        <PageSection title="1. Upload a CSV file" description="Your file never leaves the browser; rows are parsed locally.">
          <div className="flex flex-col gap-6">
            <CsvDropzone file={file} onFileSelected={(f) => void onFileSelected(f)} onRemove={onRemoveFile} error={fileError} parsing={parsing} />
            <FormField
              label="Default account"
              hintLabel="(optional here)"
              description="Required unless your file has an account column you map in step 3. You can also pick it there."
            >
              <AccountSelector value={defaultAccountId} onChange={setDefaultAccountId} placeholder="Select account" />
            </FormField>
            <Alert>
              <Info aria-hidden="true" />
              <AlertTitle>Testing failure handling</AlertTitle>
              <AlertDescription>
                The simulated server reacts to markers in the <strong>file name</strong>: <code>[FAIL]</code> rejects the import with nothing saved,{' '}
                <code>[UNKNOWN]</code> saves it but loses the confirmation (outcome unknown), <code>[SLOW]</code> adds ~3 seconds of latency.
              </AlertDescription>
            </Alert>
          </div>
        </PageSection>
      )}

      {step === 2 && parsed && (
        <PageSection title="2. Preview" description="Check that the headers and the first rows look right before mapping columns.">
          <div className="flex flex-col gap-4">
            {parsed.parseErrors.length > 0 && (
              <Alert className="border-warning/40 bg-warning/5 [&>svg]:text-warning">
                <Info aria-hidden="true" />
                <AlertTitle>The parser reported {parsed.parseErrors.length} issue{parsed.parseErrors.length === 1 ? '' : 's'}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {parsed.parseErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <CsvPreviewTable headers={parsed.headers} rows={parsed.rows} totalRows={parsed.rows.length} />
          </div>
        </PageSection>
      )}

      {step === 3 && parsed && (
        <PageSection title="3. Map columns" description="Obvious headers were detected automatically; adjust anything that is wrong.">
          <ColumnMapper
            headers={parsed.headers}
            sampleRow={parsed.rows[0] ?? null}
            config={config}
            onChange={setConfig}
            errors={showMappingErrors ? mappingErrors : {}}
            defaultAccountId={defaultAccountId}
            onDefaultAccountChange={setDefaultAccountId}
          />
        </PageSection>
      )}

      {step === 4 && validation && (
        <PageSection title="4. Validation" description="Rows are checked locally against your mapping, accounts and categories.">
          <ImportValidationSummary result={validation} skipDuplicates={skipDuplicates} onSkipDuplicatesChange={setSkipDuplicates} accounts={accounts} />
        </PageSection>
      )}

      {step === 5 && plan && validation && parsed && (
        <PageSection title="5. Review" description="This is what will be sent to the (simulated) server.">
          <ReviewPanel plan={plan} validation={validation} fileName={parsed.fileName} defaultAccountId={defaultAccountId} accounts={accounts} />
        </PageSection>
      )}

      {step === 6 && (
        <PageSection title="6. Result">
          {resultOutcome ? (
            <ImportResultSummary
              outcome={resultOutcome}
              onImportAnother={resetWizard}
              onBackToReview={() => {
                setOutcome(null)
                importAction.reset()
                setStep(5)
              }}
              onRetry={() => void submitImport()}
              retrying={importAction.isPending}
            />
          ) : (
            <PendingOperationIndicator label="Waiting for the import result…" />
          )}
        </PageSection>
      )}

      {step < 6 && (
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={importAction.isPending}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {step === 5 && importAction.isPending && <PendingOperationIndicator label="Importing…" />}
            {step < 5 ? (
              <Button type="button" onClick={goNext} disabled={!canGoNext}>
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void submitImport()}
                disabled={!plan || plan.rows.length === 0 || importAction.isPending}
                aria-busy={importAction.isPending}
              >
                {importAction.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                {importAction.isPending
                  ? 'Importing…'
                  : `Import ${plan?.rows.length ?? 0} transaction${plan?.rows.length === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------

function Stepper({ current }: { current: Step }) {
  return (
    <nav aria-label="Import progress">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 sm:gap-x-4">
        {STEPS.map((s, i) => {
          const done = s.id < current
          const active = s.id === current
          return (
            <li key={s.id} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular',
                  active && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-primary/40 bg-primary/10 text-primary',
                  !active && !done && 'border-border text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3.5" /> : s.id}
              </span>
              <span className={cn('text-sm', active ? 'font-semibold' : 'text-muted-foreground')}>
                <span className="sr-only">{done ? 'Completed: ' : active ? 'Current step: ' : ''}</span>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function ReviewPanel({
  plan,
  validation,
  fileName,
  defaultAccountId,
  accounts,
}: {
  plan: ImportPlan
  validation: ValidationResult
  fileName: string
  defaultAccountId: Id | ''
  accounts: Account[]
}) {
  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const defaultAccount = defaultAccountId ? accountById.get(defaultAccountId) : null
  const usedAccounts = [...new Set(plan.rows.map((r) => r.accountId))].map((id) => accountById.get(id)?.name ?? 'Unknown account')

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="File" value={fileName} />
        <Fact label="Rows to import" value={plan.rows.length} emphasis />
        <Fact label="Invalid rows (reported)" value={validation.invalid.length} />
        <Fact label="Skipped duplicates" value={plan.skippedDuplicates} />
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h3 className="mb-2 text-sm font-semibold">Accounts</h3>
          {usedAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows selected.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {usedAccounts.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Default account: {defaultAccount ? defaultAccount.name : 'none (every row mapped its own account)'}
          </p>
        </div>
        <div className="rounded-xl border">
          <h3 className="px-4 py-3 text-sm font-semibold">Totals by currency</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Currency</TableHead>
                <TableHead scope="col" className="text-right">
                  Income
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Expenses
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Rows
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.totals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nothing to import
                  </TableCell>
                </TableRow>
              ) : (
                plan.totals.map((t) => (
                  <TableRow key={t.currency}>
                    <TableCell>{t.currency}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={t.income} currency={t.currency} variant="type" type="income" size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay amount={t.expense} currency={t.currency} variant="type" type="expense" size="sm" />
                    </TableCell>
                    <TableCell className="text-right tabular">{t.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>What happens next</AlertTitle>
        <AlertDescription>
          The rows are sent in one request with an idempotency key. If the response is lost you will see an &ldquo;outcome unknown&rdquo; notice
          instead of a success message, and the banner at the top of the app lets you check the status before retrying.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function Fact({ label, value, emphasis }: { label: string; value: string | number; emphasis?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('truncate', emphasis ? 'text-2xl font-semibold tabular' : 'text-sm font-medium tabular')} title={String(value)}>
        {value}
      </dd>
    </div>
  )
}
