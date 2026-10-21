import type { ComponentType, ReactNode } from 'react'
import { Inbox, SearchX, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  title: string
  description?: string
  /** Primary / secondary actions. */
  action?: ReactNode
  icon?: ComponentType<LucideProps>
  /** Compact variant for cards and table bodies. */
  size?: 'default' | 'sm'
  className?: string
}

/** "Nothing here yet" — explains why and offers the next step. */
export function EmptyState({ title, description, action, icon: Icon = Inbox, size = 'default', className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed text-center',
        size === 'default' ? 'gap-3 px-6 py-12' : 'gap-2 px-4 py-8',
        className,
      )}
    >
      <div className={cn('flex items-center justify-center rounded-full bg-muted text-muted-foreground', size === 'default' ? 'size-12' : 'size-9')}>
        <Icon className={size === 'default' ? 'size-6' : 'size-4'} aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className={cn('font-semibold', size === 'default' ? 'text-base' : 'text-sm')}>{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{action}</div>}
    </div>
  )
}

/** Dedicated variant for "filters returned nothing" (distinct from an empty dataset). */
export function NoResultsState({ onClear, className }: { onClear?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={SearchX}
      size="sm"
      title="No matching records"
      description="Your current search or filters returned no results."
      action={
        onClear && (
          <button type="button" onClick={onClear} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Clear filters
          </button>
        )
      }
      className={className}
    />
  )
}
