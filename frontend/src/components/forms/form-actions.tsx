import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FormActionsProps {
  submitLabel: string
  pendingLabel?: string
  pending?: boolean
  disabled?: boolean
  onCancel?: () => void
  cancelLabel?: string
  destructive?: boolean
  /** Extra content on the left (e.g. a delete button). */
  secondary?: ReactNode
  className?: string
}

/**
 * Standard form footer. The submit button is disabled while pending so a
 * double click cannot send two requests from this form. This is a UX guard
 * only; real duplicate protection lives in the API (idempotency keys).
 */
export function FormActions({
  submitLabel,
  pendingLabel = 'Saving…',
  pending = false,
  disabled = false,
  onCancel,
  cancelLabel = 'Cancel',
  destructive = false,
  secondary,
  className,
}: FormActionsProps) {
  return (
    <div className={cn('flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>{secondary}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending || disabled} aria-busy={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  )
}
