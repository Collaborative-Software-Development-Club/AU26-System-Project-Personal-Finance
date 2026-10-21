import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Archive,
  CheckCircle2,
  CircleHelp,
  Clock,
  Pause,
  Play,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ACCOUNT_TYPE_LABEL,
  BUDGET_STATUS_LABEL,
  IMPORT_STATUS_LABEL,
  RECURRING_STATUS_LABEL,
  TRANSACTION_TYPE_LABEL,
  TRANSFER_STATUS_LABEL,
  type AccountStatus,
  type AccountType,
  type BudgetStatus,
  type Category,
  type ImportJobStatus,
  type RecurringRuleStatus,
  type TransactionSource,
  type TransactionType,
  type TransferDirection,
  type TransferStatus,
} from '@/domain'
import { cn } from '@/lib/utils'

/* Status is always shown with text + icon, never colour alone. */

export function TransactionTypeBadge({ type, direction, className }: { type: TransactionType; direction?: TransferDirection | null; className?: string }) {
  const map: Record<TransactionType, { icon: LucideIcon; classes: string }> = {
    income: { icon: ArrowDownLeft, classes: 'border-income/30 bg-income/10 text-income' },
    expense: { icon: ArrowUpRight, classes: 'border-expense/30 bg-expense/10 text-expense' },
    transfer: { icon: ArrowLeftRight, classes: 'border-transfer/30 bg-transfer/10 text-transfer' },
  }
  const { icon: Icon, classes } = map[type]
  const label = type === 'transfer' && direction ? (direction === 'out' ? 'Transfer out' : 'Transfer in') : TRANSACTION_TYPE_LABEL[type]
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', classes, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}

export function AccountTypeBadge({ type, className }: { type: AccountType; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('font-medium', className)}>
      {ACCOUNT_TYPE_LABEL[type]}
    </Badge>
  )
}

export function AccountStatusBadge({ status, className }: { status: AccountStatus; className?: string }) {
  if (status === 'active') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-success/30 text-success', className)}>
        <CheckCircle2 className="size-3" aria-hidden="true" />
        Active
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
      <Archive className="size-3" aria-hidden="true" />
      Archived
    </Badge>
  )
}

export function BudgetStatusBadge({ status, className }: { status: BudgetStatus; className?: string }) {
  const map: Record<BudgetStatus, { icon: LucideIcon; classes: string }> = {
    under: { icon: CheckCircle2, classes: 'border-success/30 bg-success/10 text-success' },
    warning: { icon: Clock, classes: 'border-warning/40 bg-warning/10 text-warning' },
    at: { icon: Clock, classes: 'border-warning/40 bg-warning/10 text-warning' },
    over: { icon: XCircle, classes: 'border-expense/30 bg-expense/10 text-expense' },
  }
  const { icon: Icon, classes } = map[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', classes, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {BUDGET_STATUS_LABEL[status]}
    </Badge>
  )
}

export function RecurringStatusBadge({ status, className }: { status: RecurringRuleStatus; className?: string }) {
  const map: Record<RecurringRuleStatus, { icon: LucideIcon; classes: string }> = {
    active: { icon: Play, classes: 'border-success/30 bg-success/10 text-success' },
    paused: { icon: Pause, classes: 'border-warning/40 bg-warning/10 text-warning' },
    completed: { icon: CheckCircle2, classes: 'text-muted-foreground' },
    cancelled: { icon: XCircle, classes: 'text-muted-foreground' },
  }
  const { icon: Icon, classes } = map[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', classes, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {RECURRING_STATUS_LABEL[status]}
    </Badge>
  )
}

export function TransferStatusBadge({ status, className }: { status: TransferStatus; className?: string }) {
  const map: Record<TransferStatus, { icon: LucideIcon; classes: string }> = {
    completed: { icon: CheckCircle2, classes: 'border-success/30 bg-success/10 text-success' },
    pending: { icon: Clock, classes: 'border-warning/40 bg-warning/10 text-warning' },
    failed: { icon: XCircle, classes: 'border-expense/30 bg-expense/10 text-expense' },
    unknown: { icon: CircleHelp, classes: 'border-warning/40 bg-warning/10 text-warning' },
  }
  const { icon: Icon, classes } = map[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', classes, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {TRANSFER_STATUS_LABEL[status]}
    </Badge>
  )
}

export function ImportStatusBadge({ status, className }: { status: ImportJobStatus; className?: string }) {
  const map: Record<ImportJobStatus, { icon: LucideIcon; classes: string }> = {
    completed: { icon: CheckCircle2, classes: 'border-success/30 bg-success/10 text-success' },
    partial: { icon: Clock, classes: 'border-warning/40 bg-warning/10 text-warning' },
    failed: { icon: XCircle, classes: 'border-expense/30 bg-expense/10 text-expense' },
    unknown: { icon: CircleHelp, classes: 'border-warning/40 bg-warning/10 text-warning' },
  }
  const { icon: Icon, classes } = map[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', classes, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {IMPORT_STATUS_LABEL[status]}
    </Badge>
  )
}

export const SOURCE_LABEL: Record<TransactionSource, string> = {
  manual: 'Manual entry',
  recurring: 'Recurring rule',
  import: 'CSV import',
  transfer: 'Transfer',
}

export function SourceBadge({ source, className }: { source: TransactionSource; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('font-normal', className)}>
      {SOURCE_LABEL[source]}
    </Badge>
  )
}

/** Coloured dot + name for a category. Handles a missing category gracefully. */
export function CategoryChip({ category, className }: { category: Category | null | undefined; className?: string }) {
  if (!category) return <span className={cn('text-sm text-muted-foreground', className)}>Uncategorised</span>
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm', className)}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
      <span className="truncate">{category.name}</span>
    </span>
  )
}

/** Small colour square used in lists and selectors. */
export function ColorDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', className)} style={{ backgroundColor: color ?? 'var(--muted-foreground)' }} aria-hidden="true" />
}
