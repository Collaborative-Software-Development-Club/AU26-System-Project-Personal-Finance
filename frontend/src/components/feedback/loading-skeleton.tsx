import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'page' | 'cards' | 'table' | 'chart' | 'form' | 'list'

/**
 * Placeholder layouts shown while data loads. Never render real-looking zeros
 * while loading — use these instead.
 */
export function LoadingSkeleton({ variant = 'table', rows = 6, className }: { variant?: SkeletonVariant; rows?: number; className?: string }) {
  switch (variant) {
    case 'cards':
      return (
        <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )
    case 'chart':
      return (
        <div className={cn('space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10', className)}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
      )
    case 'form':
      return (
        <div className={cn('space-y-5', className)}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      )
    case 'list':
      return (
        <div className={cn('space-y-2', className)}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )
    case 'page':
      return (
        <div className={cn('space-y-6', className)}>
          <LoadingSkeleton variant="cards" />
          <div className="grid gap-4 lg:grid-cols-3">
            <LoadingSkeleton variant="chart" className="lg:col-span-2" />
            <LoadingSkeleton variant="list" rows={4} />
          </div>
        </div>
      )
    case 'table':
    default:
      return (
        <div className={cn('overflow-hidden rounded-xl ring-1 ring-foreground/10', className)}>
          <div className="flex gap-4 border-b bg-muted/50 px-4 py-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b px-4 py-3 last:border-0">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      )
  }
}
