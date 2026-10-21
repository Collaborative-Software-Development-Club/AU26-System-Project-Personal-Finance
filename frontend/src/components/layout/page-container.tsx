import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePageHeaderMeta } from './page-header-context'

/**
 * Standard content wrapper: consistent padding and max width. Shows the page
 * description under the header (the title lives in the global header).
 */
export function PageContainer({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode
  className?: string
  width?: 'default' | 'narrow' | 'wide'
}) {
  const meta = usePageHeaderMeta()
  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-6 p-4 sm:p-6',
        width === 'narrow' && 'max-w-3xl',
        width === 'default' && 'max-w-7xl',
        width === 'wide' && 'max-w-[1600px]',
        className,
      )}
    >
      {meta?.description && <p className="-mb-2 text-sm text-muted-foreground">{meta.description}</p>}
      {children}
    </div>
  )
}

/** A titled section inside a page. */
export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
