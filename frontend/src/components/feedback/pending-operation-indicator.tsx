import { CircleHelp, Loader2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Inline "working…" indicator for buttons and rows. */
export function PendingOperationIndicator({ label = 'Working…', className }: { label?: string; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  )
}

/**
 * Shown when the client could not learn whether an operation committed.
 * Never phrase this as success or failure.
 */
export function OutcomeUnknownNotice({
  title = 'Outcome unknown',
  description = 'The request was sent but no confirmation came back. It may or may not have been saved. Check its status before trying again — resubmitting could create a duplicate.',
  onCheckStatus,
  checking = false,
  className,
}: {
  title?: string
  description?: string
  onCheckStatus?: () => void
  checking?: boolean
  className?: string
}) {
  return (
    <Alert className={cn('border-warning/40 bg-warning/5 [&>svg]:text-warning', className)}>
      <CircleHelp aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="gap-3">
        <p>{description}</p>
        {onCheckStatus && (
          <Button size="sm" variant="outline" onClick={onCheckStatus} disabled={checking}>
            {checking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Check status
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
