import { CircleHelp, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinanceStore } from '@/store/finance-store'
import { toast } from './toast'

/**
 * Lists operations whose outcome is unknown until the user reconciles them.
 * Appears above page content on every page so it cannot be missed.
 */
export function UnresolvedOperationsBanner() {
  const ops = useFinanceStore((s) => s.unresolvedOperations)
  const pending = useFinanceStore((s) => s.pending)
  const reconcile = useFinanceStore((s) => s.reconcile)
  const dismiss = useFinanceStore((s) => s.dismissUnresolved)

  if (ops.length === 0) return null

  const check = async (key: string) => {
    try {
      const outcome = await reconcile(key)
      if (outcome === 'committed') toast.success('Operation was saved', { description: 'The server confirmed it completed; your data has been updated.' })
      else toast.info('Operation was not saved', { description: 'The server has no record of it. You can safely submit it again.' })
    } catch (e) {
      toast.error('Could not check status', { description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <div role="region" aria-label="Operations awaiting confirmation" className="border-b border-warning/40 bg-warning/10">
      <ul className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        {ops.map((op) => {
          const checking = !!pending[`reconcile:${op.idempotencyKey}`]
          return (
            <li key={op.idempotencyKey} className="flex flex-wrap items-center gap-2 text-sm">
              <CircleHelp className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="font-medium">Outcome unknown:</span>
              <span className="min-w-0 flex-1 truncate">{op.summary}</span>
              <Button size="sm" variant="outline" onClick={() => void check(op.idempotencyKey)} disabled={checking}>
                {checking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                Check status
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => dismiss(op.idempotencyKey)} aria-label="Dismiss">
                <X aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
