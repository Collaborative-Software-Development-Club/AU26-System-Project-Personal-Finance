import { useId, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Check, Database, Monitor, Moon, Paintbrush, Settings2, Sun, Trash2, Undo2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer, PageSection, usePageHeader } from '@/components/layout'
import { ConfirmDialog, FormErrorMessage, toast } from '@/components/feedback'
import { FormField, FormGrid, SelectInput } from '@/components/forms'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useFinanceStore, useSettingsStore } from '@/store'
import { useTheme, type ThemePreference } from '@/app/theme'
import {
  CURRENCIES,
  CURRENCY_CODES,
  DATE_FORMAT_OPTIONS,
  NAME_MAX_LENGTH,
  REPORTING_PERIODS,
  todayISO,
  type CurrencyCode,
  type DateFormat,
  type ReportingPeriod,
  type UserSettings,
} from '@/domain'
import { cn } from '@/lib/utils'

type SettingsTab = 'general' | 'display' | 'data'
const TABS: SettingsTab[] = ['general', 'display', 'data']

/** BCP 47 locales offered for number formatting. */
const NUMBER_LOCALES: { value: string; label: string }[] = [
  { value: 'en-US', label: 'English (United States) — 1,234.56' },
  { value: 'en-GB', label: 'English (United Kingdom) — 1,234.56' },
  { value: 'en-CA', label: 'English (Canada) — 1,234.56' },
  { value: 'en-AU', label: 'English (Australia) — 1,234.56' },
  { value: 'de-DE', label: 'German — 1.234,56' },
  { value: 'fr-FR', label: 'French — 1 234,56' },
  { value: 'es-ES', label: 'Spanish — 1.234,56' },
  { value: 'ja-JP', label: 'Japanese — 1,234.56' },
]

const THRESHOLD_MIN = 50
const THRESHOLD_MAX = 100

const SAVED_TOAST_ID = 'settings-saved'
function notifySaved(what: string) {
  toast.success('Saved', { id: SAVED_TOAST_ID, description: what, duration: 1800 })
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: SettingsTab = TABS.includes(tabParam as SettingsTab) ? (tabParam as SettingsTab) : 'general'

  usePageHeader({
    title: 'Settings',
    description: 'Preferences are saved immediately and kept in this browser.',
  })

  return (
    <PageContainer width="narrow">
      <Tabs value={tab} onValueChange={(v) => setSearchParams(v === 'general' ? {} : { tab: v }, { replace: true })}>
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="general">
            <Settings2 aria-hidden="true" />
            General
          </TabsTrigger>
          <TabsTrigger value="display">
            <Paintbrush aria-hidden="true" />
            Display
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database aria-hidden="true" />
            Data
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-4">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="display" className="pt-4">
          <DisplayTab />
        </TabsContent>
        <TabsContent value="data" className="pt-4">
          <DataTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

function useSettings() {
  return useSettingsStore(
    useShallow((s) => ({
      displayName: s.displayName,
      defaultCurrency: s.defaultCurrency,
      dateFormat: s.dateFormat,
      numberLocale: s.numberLocale,
      defaultDashboardPeriod: s.defaultDashboardPeriod,
      budgetWarningThreshold: s.budgetWarningThreshold,
      simulateLatency: s.simulateLatency,
      update: s.update,
    })),
  )
}

function GeneralTab() {
  const settings = useSettings()
  const update = (patch: Partial<UserSettings>, what: string) => {
    settings.update(patch)
    notifySaved(what)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageSection title="Profile">
        <DisplayNameField value={settings.displayName} onSave={(v) => update({ displayName: v }, 'Display name updated')} />
      </PageSection>

      <PageSection title="Defaults" description="Used when a page or form does not specify its own value.">
        <FormGrid>
          <FormField label="Default currency" description="Pre-selected for new accounts and used when an amount has no account.">
            <SelectInput<CurrencyCode>
              value={settings.defaultCurrency}
              onChange={(v) => update({ defaultCurrency: v }, `Default currency set to ${v}`)}
              options={CURRENCY_CODES.map((code) => ({
                value: code,
                label: `${CURRENCIES[code].name} (${code})`,
                description: CURRENCIES[code].symbol,
              }))}
            />
          </FormField>
          <FormField label="Default dashboard period" description="The period the dashboard opens with.">
            <SelectInput<ReportingPeriod>
              value={settings.defaultDashboardPeriod}
              onChange={(v) => update({ defaultDashboardPeriod: v }, 'Dashboard period updated')}
              options={REPORTING_PERIODS}
            />
          </FormField>
        </FormGrid>
      </PageSection>

      <PageSection title="Budgets">
        <ThresholdField
          valuePercent={Math.round(settings.budgetWarningThreshold * 100)}
          onSave={(pct) => update({ budgetWarningThreshold: pct / 100 }, `Budgets now warn at ${pct}%`)}
        />
      </PageSection>
    </div>
  )
}

/** Text setting committed on blur / Enter so a toast is not fired per keystroke. */
function DisplayNameField({ value, onSave }: { value: string; onSave(next: string): void }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const dirty = draft !== value

  const commit = () => {
    const next = draft.trim()
    if (!next) {
      setError('Display name is required.')
      return
    }
    if (next.length > NAME_MAX_LENGTH) {
      setError(`Display name must be ${NAME_MAX_LENGTH} characters or fewer.`)
      return
    }
    setError(null)
    if (next !== value) onSave(next)
    setDraft(next)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    commit()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:max-w-md">
      <FormField label="Display name" required description="Shown in the header and the user menu." error={error}>
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onBlur={commit}
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH + 1}
        />
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={!dirty}>
          Save name
        </Button>
        {!dirty && !error && (
          <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5 text-success" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

function ThresholdField({ valuePercent, onSave }: { valuePercent: number; onSave(pct: number): void }) {
  const [draft, setDraft] = useState(String(valuePercent))
  const [error, setError] = useState<string | null>(null)
  const dirty = draft !== String(valuePercent)

  const commit = () => {
    const pct = Number(draft)
    if (!Number.isInteger(pct) || pct < THRESHOLD_MIN || pct > THRESHOLD_MAX) {
      setError(`Enter a whole number between ${THRESHOLD_MIN} and ${THRESHOLD_MAX}.`)
      return
    }
    setError(null)
    if (pct !== valuePercent) onSave(pct)
    setDraft(String(pct))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        commit()
      }}
      className="flex flex-col gap-3 sm:max-w-md"
    >
      <FormField
        label="Budget warning threshold"
        description={`Budgets without their own threshold show a warning once spending reaches this percentage (${THRESHOLD_MIN}–${THRESHOLD_MAX}).`}
        error={error}
      >
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (error) setError(null)
            }}
            onBlur={commit}
            className="w-28 tabular"
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            %
          </span>
        </div>
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={!dirty}>
          Save threshold
        </Button>
        {!dirty && !error && (
          <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5 text-success" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme.', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow the operating system setting.', icon: Monitor },
]

function DisplayTab() {
  const settings = useSettings()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const fmt = useFormatters()
  const themeId = useId()

  const update = (patch: Partial<UserSettings>, what: string) => {
    settings.update(patch)
    notifySaved(what)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageSection title="Theme">
        <RadioGroup
          value={theme}
          onValueChange={(v) => {
            setTheme(v as ThemePreference)
            notifySaved(`Theme set to ${v}`)
          }}
          aria-label="Theme preference"
          className="gap-2 sm:grid-cols-3"
        >
          {THEME_OPTIONS.map((opt) => {
            const id = `${themeId}-${opt.value}`
            const Icon = opt.icon
            return (
              <Label
                key={opt.value}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem id={id} value={opt.value} className="mt-0.5" />
                <span className="flex flex-col gap-0.5 leading-snug">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon className="size-4" aria-hidden="true" />
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </span>
              </Label>
            )
          })}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Currently showing the {resolvedTheme} theme{theme === 'system' ? ' (from your system)' : ''}.
        </p>
      </PageSection>

      <PageSection title="Formatting">
        <FormGrid>
          <FormField label="Date format">
            <SelectInput<DateFormat>
              value={settings.dateFormat}
              onChange={(v) => update({ dateFormat: v }, 'Date format updated')}
              options={DATE_FORMAT_OPTIONS}
            />
          </FormField>
          <FormField label="Number format" description="Locale used for grouping and decimal separators.">
            <SelectInput
              value={settings.numberLocale}
              onChange={(v) => update({ numberLocale: v }, 'Number format updated')}
              options={NUMBER_LOCALES}
            />
          </FormField>
        </FormGrid>

        <div className="rounded-xl border bg-muted/30 p-4" aria-live="polite">
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Preview</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium tabular">{fmt.money(123456789, settings.defaultCurrency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Signed</dt>
              <dd className="font-medium tabular">{fmt.signedMoney(-4250, settings.defaultCurrency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium tabular">{fmt.date(todayISO())}</dd>
            </div>
          </dl>
        </div>
      </PageSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const MARKERS: { marker: string; behaviour: string }[] = [
  { marker: '[FAIL]', behaviour: 'The request is rejected with a server error. Nothing is saved.' },
  { marker: '[UNKNOWN]', behaviour: 'The change IS saved, but the confirmation is lost. The app shows "outcome unknown" and offers a status check.' },
  { marker: '[SLOW]', behaviour: 'The request takes about 3 seconds (only when latency simulation is on).' },
]

function DataTab() {
  const settings = useSettings()
  const latencyId = useId()
  const { resetToSample, resetToEmpty } = useFinanceStore(useShallow((s) => ({ resetToSample: s.resetToSample, resetToEmpty: s.resetToEmpty })))
  const [dialog, setDialog] = useState<'sample' | 'empty' | null>(null)

  const sample = useAsyncAction(async () => {
    await resetToSample()
    return true
  })
  const empty = useAsyncAction(async () => {
    await resetToEmpty()
    return true
  })
  const pending = sample.isPending || empty.isPending

  // On failure the dialog stays open and shows the error so the user can retry.
  const confirm = async () => {
    if (dialog === 'sample') {
      const ok = await sample.run()
      if (!ok) return
      setDialog(null)
      toast.success('Sample data restored', { description: 'Accounts, transactions, budgets and import history were replaced with the sample dataset.' })
    } else if (dialog === 'empty') {
      const ok = await empty.run()
      if (!ok) return
      setDialog(null)
      toast.success('Data cleared', { description: 'You now have an empty workspace with the default categories.' })
    }
  }

  const closeDialog = (open: boolean) => {
    if (open) return
    setDialog(null)
    sample.reset()
    empty.reset()
  }

  return (
    <div className="flex flex-col gap-8">
      <PageSection title="Simulation" description="The app runs against an in-browser mock server. These options control how realistic it behaves.">
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor={latencyId} className="font-medium">
              Simulate network latency
            </Label>
            <p className="text-xs text-muted-foreground">Adds 250–500 ms to every request so loading and pending states are visible.</p>
          </div>
          <Switch
            id={latencyId}
            checked={settings.simulateLatency}
            onCheckedChange={(checked) => {
              settings.update({ simulateLatency: checked })
              notifySaved(checked ? 'Latency simulation on' : 'Latency simulation off')
            }}
          />
        </div>

        <div className="rounded-xl border">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold">Failure markers</h3>
            <p className="text-xs text-muted-foreground">
              Put one of these in a description, memo, name or import file name to trigger a deterministic behaviour — handy for demoing error handling.
            </p>
          </div>
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-32">
                    Marker
                  </TableHead>
                  <TableHead scope="col">Behaviour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MARKERS.map((m) => (
                  <TableRow key={m.marker}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{m.marker}</code>
                    </TableCell>
                    <TableCell className="whitespace-normal">{m.behaviour}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageSection>

      <PageSection title="Reset data" description="Both actions replace everything stored by the mock: accounts, transactions, transfers, budgets, recurring rules and import history.">
        <Alert>
          <Database aria-hidden="true" />
          <AlertTitle>Your data lives in this browser only</AlertTitle>
          <AlertDescription>
            Everything is kept in this browser&rsquo;s localStorage. Clearing site data, using another browser or another device starts from the sample
            dataset again. This is a demo workflow, not a production data-deletion feature.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResetCard
            icon={Undo2}
            title="Reset to sample data"
            description="Discard all current data and restore the original sample accounts, transactions and budgets."
            actionLabel="Reset to sample data"
            onClick={() => setDialog('sample')}
            disabled={pending}
          />
          <ResetCard
            icon={Trash2}
            title="Start with empty data"
            description="Discard all current data and start with no accounts or transactions (default categories are kept)."
            actionLabel="Start with empty data"
            onClick={() => setDialog('empty')}
            disabled={pending}
          />
        </div>
      </PageSection>

      <ConfirmDialog
        open={dialog === 'sample'}
        onOpenChange={closeDialog}
        title="Reset to sample data?"
        description="All accounts, transactions, transfers, budgets, recurring rules and import history in this browser will be removed and replaced with the sample dataset. This cannot be undone."
        confirmLabel="Reset to sample data"
        destructive
        pending={sample.isPending}
        onConfirm={() => void confirm()}
      >
        {sample.status === 'error' && <FormErrorMessage message={sample.error} />}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'empty'}
        onOpenChange={closeDialog}
        title="Delete everything and start empty?"
        description="All accounts, transactions, transfers, budgets, recurring rules and import history in this browser will be removed. Only the default categories remain. This cannot be undone."
        confirmLabel="Delete all data"
        destructive
        pending={empty.isPending}
        onConfirm={() => void confirm()}
      >
        {empty.status === 'error' && <FormErrorMessage message={empty.error} />}
      </ConfirmDialog>
    </div>
  )
}

function ResetCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
  disabled,
}: {
  icon: typeof Trash2
  title: string
  description: string
  actionLabel: string
  onClick(): void
  disabled?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-destructive/30 p-4')}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button type="button" variant="destructive" onClick={onClick} disabled={disabled} className="self-start">
        <Icon aria-hidden="true" />
        {actionLabel}
      </Button>
    </div>
  )
}
