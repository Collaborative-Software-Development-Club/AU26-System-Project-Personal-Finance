import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { InlineValidationMessage } from '@/components/feedback/inline-validation-message'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label: string
  /** Rendered after the label; e.g. "(optional)". */
  hintLabel?: string
  /** Helper text under the control. */
  description?: string
  error?: string | null
  required?: boolean
  className?: string
  /** A single form control. It receives id / aria-* props automatically. */
  children: ReactNode
}

interface InjectedProps {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

/**
 * Label + control + description + error, wired together with ids so screen
 * readers announce errors with the field. Works with Input, Textarea,
 * SelectInput, MoneyInput, DateInput, etc. (anything accepting `id`).
 */
export function FormField({ label, hintLabel, description, error, required, className, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const descId = `${id}-desc`
  const describedBy = [description ? descId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  const control = isValidElement<InjectedProps>(children)
    ? cloneElement(children as ReactElement<InjectedProps>, {
        id: children.props.id ?? id,
        'aria-invalid': !!error || undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : children

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={isValidElement<InjectedProps>(children) ? children.props.id ?? id : id} className="gap-1">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
        {hintLabel && <span className="font-normal text-muted-foreground">{hintLabel}</span>}
      </Label>
      {control}
      {description && !error && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      <InlineValidationMessage id={errorId} message={error} />
    </div>
  )
}

/** Responsive grid for form rows: one column on mobile, two on md+. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 md:grid-cols-2', className)}>{children}</div>
}
