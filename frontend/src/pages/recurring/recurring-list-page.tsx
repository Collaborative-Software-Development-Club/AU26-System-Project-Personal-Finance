import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Ban, CalendarClock, Info, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { CategoryChip, MoneyDisplay, RecurringStatusBadge, TransactionTypeBadge } from '@/components/financial'
import { SelectInput, type SelectOption } from '@/components/forms'
import { ConfirmDialog, EmptyState, FormErrorMessage, InlineValidationMessage, NoResultsState, PendingOperationIndicator, toast } from '@/components/feedback'
import { RECURRING_STATUS_LABEL, describeFrequency, todayISO, type Account, type Category, type Id, type RecurringRule, type RecurringRuleStatus } from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useAccountMap, useCategoryMap, useFinanceStore, useIsPending } from '@/store'

type StatusFilter = 'all' | RecurringRuleStatus

const STATUS_OPTIONS: SelectOption<StatusFilter>[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: RECURRING_STATUS_LABEL.active },
  { value: 'paused', label: RECURRING_STATUS_LABEL.paused },
  { value: 'completed', label: RECURRING_STATUS_LABEL.completed },
  { value: 'cancelled', label: RECURRING_STATUS_LABEL.cancelled },
]

const STATUS_ORDER: Record<RecurringRuleStatus, number> = { active: 0, paused: 1, completed: 2, cancelled: 3 }

type PendingConfirm = { kind: 'cancel'; rule: RecurringRule } | { kind: 'delete'; rule: RecurringRule }

export default function RecurringListPage() {
  const rules = useFinanceStore((s) => s.recurringRules)
  const accountMap = useAccountMap()
  const categoryMap = useCategoryMap()
  const setRecurringRuleStatus = useFinanceStore((s) => s.setRecurringRuleStatus)
  const deleteRecurringRule = useFinanceStore((s) => s.deleteRecurringRule)

  const [status, setStatus] = useState<StatusFilter>('all')
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null)

  usePageHeader({
    title: 'Recurring',
    description: 'Rules that describe transactions you expect to repeat.',
    actions: (
      <Button asChild>
        <Link to="/recurring/new">
          <Plus aria-hidden="true" />
          Add rule
        </Link>
      </Button>
    ),
  })

  const sorted = useMemo(
    () =>
      [...rules].sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          (a.nextRunDate ?? '9999-12-31').localeCompare(b.nextRunDate ?? '9999-12-31') ||
          a.description.localeCompare(b.description),
      ),
    [rules],
  )
  const filtered = useMemo(() => (status === 'all' ? sorted : sorted.filter((r) => r.status === status)), [sorted, status])

  const cancelAction = useAsyncAction(async (id: Id) => setRecurringRuleStatus(id, 'cancelled'))
  const deleteAction = useAsyncAction(async (id: Id) => {
    await deleteRecurringRule(id)
    return true
  })
  const confirmPending = confirm?.kind === 'cancel' ? cancelAction.isPending : deleteAction.isPending
  const confirmError = confirm?.kind === 'cancel' ? cancelAction.error : deleteAction.error
  const confirmStatus = confirm?.kind === 'cancel' ? cancelAction.status : deleteAction.status

  const onConfirm = async () => {
    if (!confirm) return
    if (confirm.kind === 'cancel') {
      const result = await cancelAction.run(confirm.rule.id)
      if (result) {
        toast.success('Rule cancelled', { description: result.description })
        setConfirm(null)
      }
    } else {
      const ok = await deleteAction.run(confirm.rule.id)
      if (ok) {
        toast.success('Rule deleted', { description: confirm.rule.description })
        setConfirm(null)
      }
    }
  }

  const intentNote = (
    <Alert>
      <Info aria-hidden="true" />
      <AlertTitle>Schedules describe intent, not completed activity</AlertTitle>
      <AlertDescription>
        This app does not create transactions from these rules. The backend will record each occurrence when it runs; a next-run date in the past does not mean a transaction was
        posted.
      </AlertDescription>
    </Alert>
  )

  if (rules.length === 0) {
    return (
      <PageContainer>
        {intentNote}
        <EmptyState
          icon={CalendarClock}
          title="No recurring rules"
          description="Add rules for salary, rent, subscriptions and other repeating transactions to see what is coming up."
          action={
            <Button asChild>
              <Link to="/recurring/new">
                <Plus aria-hidden="true" />
                Add rule
              </Link>
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {intentNote}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recurring-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <SelectInput<StatusFilter> id="recurring-status" value={status} onChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rules.length} rule{rules.length === 1 ? '' : 's'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <NoResultsState onClear={() => setStatus('all')} />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  account={accountMap.get(rule.accountId)}
                  category={categoryMap.get(rule.categoryId)}
                  onCancel={() => setConfirm({ kind: 'cancel', rule })}
                  onDelete={() => setConfirm({ kind: 'delete', rule })}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === 'cancel' ? `Cancel “${confirm.rule.description}”?` : `Delete “${confirm?.rule.description ?? 'rule'}”?`}
        description={
          confirm?.kind === 'cancel'
            ? 'A cancelled rule stops scheduling future occurrences and cannot be resumed. Pause it instead if you want to continue later.'
            : 'The rule will be removed. Transactions already recorded from it are kept.'
        }
        confirmLabel={confirm?.kind === 'cancel' ? 'Cancel rule' : 'Delete rule'}
        cancelLabel="Keep rule"
        destructive
        pending={confirmPending}
        onConfirm={onConfirm}
      >
        {confirmStatus === 'error' && <FormErrorMessage message={confirmError} />}
      </ConfirmDialog>
    </PageContainer>
  )
}

function RuleRow({
  rule,
  account,
  category,
  onCancel,
  onDelete,
}: {
  rule: RecurringRule
  account: Account | undefined
  category: Category | undefined
  onCancel(): void
  onDelete(): void
}) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const setRecurringRuleStatus = useFinanceStore((s) => s.setRecurringRuleStatus)
  const statusPending = useIsPending(`recurringStatus:${rule.id}`)
  const deletePending = useIsPending(`deleteRecurringRule:${rule.id}`)
  const busy = statusPending || deletePending

  // Per-row action so several rows can be toggled independently.
  const toggle = useAsyncAction(async (status: 'active' | 'paused') => setRecurringRuleStatus(rule.id, status))
  const onToggle = async () => {
    const next = rule.status === 'paused' ? 'active' : 'paused'
    const result = await toggle.run(next)
    if (result) toast.success(next === 'paused' ? 'Rule paused' : result.status === 'completed' ? 'Rule completed' : 'Rule resumed', { description: result.description })
  }

  const frequency = describeFrequency(rule.frequency, rule.interval)
  const today = todayISO()
  const nextIsPast = rule.status === 'active' && rule.nextRunDate !== null && rule.nextRunDate < today
  const canToggle = rule.status === 'active' || rule.status === 'paused'
  const canCancel = rule.status === 'active' || rule.status === 'paused'

  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <div className="flex flex-col gap-0.5">
          <span className="truncate font-medium">{rule.description}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <TransactionTypeBadge type={rule.type} className="h-5 px-1.5 text-[10px]" />
            <span className="lg:hidden">{frequency}</span>
            <span className="md:hidden">· {account?.name ?? 'Unknown account'}</span>
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <MoneyDisplay amount={rule.amount} currency={rule.currency} variant="type" type={rule.type} size="sm" className="font-medium" />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">{account?.name ?? 'Unknown account'}</TableCell>
      <TableCell className="hidden md:table-cell">
        <CategoryChip category={category} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">{frequency}</TableCell>
      <TableCell className="tabular">
        {rule.nextRunDate ? (
          <div className="flex flex-col">
            <span>{fmt.date(rule.nextRunDate)}</span>
            {nextIsPast && <span className="text-xs text-muted-foreground">Date passed — awaiting backend</span>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {busy ? <PendingOperationIndicator label={deletePending ? 'Deleting…' : 'Updating…'} /> : <RecurringStatusBadge status={rule.status} />}
        {toggle.status === 'error' && <InlineValidationMessage message={toggle.error} className="mt-1 whitespace-normal" />}
      </TableCell>
      <TableCell className="p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${rule.description}`} disabled={busy}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(`/recurring/${rule.id}/edit`)} disabled={rule.status === 'cancelled'}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
            {canToggle && (
              <DropdownMenuItem onSelect={onToggle}>
                {rule.status === 'paused' ? (
                  <>
                    <Play aria-hidden="true" /> Resume
                  </>
                ) : (
                  <>
                    <Pause aria-hidden="true" /> Pause
                  </>
                )}
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem onSelect={onCancel}>
                <Ban aria-hidden="true" /> Cancel rule…
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 aria-hidden="true" /> Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
