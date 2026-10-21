import { Link } from 'react-router'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'

export default function NotFoundPage() {
  usePageHeader({ title: 'Page not found' })
  return (
    <PageContainer width="narrow">
      <EmptyState
        icon={FileQuestion}
        title="404 — Page not found"
        description="The page you requested doesn't exist. Check the address or head back to the dashboard."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}
