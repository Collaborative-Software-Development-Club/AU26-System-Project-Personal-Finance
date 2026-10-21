import { Link } from 'react-router'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'

/**
 * Not-found state for an invalid entity id (e.g. /accounts/does-not-exist).
 * Use inside a page when the record is missing from the store.
 */
export function EntityNotFound({ entity, backTo, backLabel }: { entity: string; backTo: string; backLabel: string }) {
  usePageHeader({ title: `${entity} not found` })
  return (
    <PageContainer width="narrow">
      <EmptyState
        icon={FileQuestion}
        title={`${entity} not found`}
        description={`This ${entity.toLowerCase()} doesn't exist in your data. It may have been deleted.`}
        action={
          <Button asChild variant="outline">
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
