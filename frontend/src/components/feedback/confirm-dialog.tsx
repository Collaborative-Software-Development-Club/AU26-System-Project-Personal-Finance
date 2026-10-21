import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: ReactNode
  /** Extra content between description and footer (e.g. a summary table). */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive styling for delete/reset actions. */
  destructive?: boolean
  /** Disables buttons and shows a spinner while the action runs. */
  pending?: boolean
  /** Disable confirm independently of pending (e.g. requires typed confirmation). */
  confirmDisabled?: boolean
  onConfirm(): void
}

/** Accessible confirmation dialog (focus trapped, Esc to cancel). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  pending = false,
  confirmDisabled = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || confirmDisabled}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            className={cn(destructive && buttonVariants({ variant: 'destructive' }), destructive && 'bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:text-white')}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
