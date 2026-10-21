import { isRouteErrorResponse, Link, useNavigate, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/feedback/error-state'
import { useDocumentTitle } from '@/hooks/use-document-title'

/**
 * Catches render/loader errors for a whole route tree. Shows a friendly
 * message with retry + a way home. Never exposes stack traces.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  useDocumentTitle(notFound ? 'Page not found' : 'Something went wrong')

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <ErrorState
          title={notFound ? 'Page not found' : 'Something went wrong'}
          description={notFound ? 'The page you are looking for does not exist or has moved.' : 'An unexpected error occurred while displaying this page. Your data has not been changed.'}
          onRetry={notFound ? undefined : () => navigate(0)}
          retryLabel="Reload page"
          action={
            <Button asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}
