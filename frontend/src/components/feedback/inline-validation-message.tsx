import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Field-level error. Pair with `aria-describedby` on the input (FormField does this). */
export function InlineValidationMessage({ id, message, className }: { id?: string; message?: string | null; className?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className={cn('flex items-start gap-1.5 text-xs text-destructive', className)}>
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

/** Form-level error (not tied to a single field). */
export function FormErrorMessage({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null
  return (
    <div role="alert" className={cn('flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive', className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
