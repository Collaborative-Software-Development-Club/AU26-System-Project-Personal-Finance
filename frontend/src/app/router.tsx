/**
 * Route table. Pages are code-split with React.lazy.
 *
 * URL structure:
 *   /dashboard
 *   /accounts            /accounts/new        /accounts/:id        /accounts/:id/edit
 *   /transactions        /transactions/new    /transactions/:id    /transactions/:id/edit
 *   /transfers           /transfers/new
 *   /budgets             /budgets/new         /budgets/:id         /budgets/:id/edit
 *   /recurring           /recurring/new       /recurring/:id/edit
 *   /categories
 *   /summary             (monthly summary)
 *   /reports
 *   /import              /import/history
 *   /settings
 *   /login  /register    (AuthLayout — no sidebar)
 *   *                    NotFound
 */
import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { LoadingSkeleton } from '@/components/feedback/loading-skeleton'
import { RouteErrorPage } from '@/pages/errors/route-error-page'

function page(loader: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(loader)
  return (
    <Suspense
      fallback={
        <div className="p-6" aria-busy="true">
          <LoadingSkeleton variant="page" />
        </div>
      }
    >
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: page(() => import('@/pages/dashboard/dashboard-page')) },

      { path: 'accounts', element: page(() => import('@/pages/accounts/accounts-list-page')) },
      { path: 'accounts/new', element: page(() => import('@/pages/accounts/account-form-page')) },
      { path: 'accounts/:id', element: page(() => import('@/pages/accounts/account-details-page')) },
      { path: 'accounts/:id/edit', element: page(() => import('@/pages/accounts/account-form-page')) },

      { path: 'transactions', element: page(() => import('@/pages/transactions/transactions-list-page')) },
      { path: 'transactions/new', element: page(() => import('@/pages/transactions/transaction-form-page')) },
      { path: 'transactions/:id', element: page(() => import('@/pages/transactions/transaction-details-page')) },
      { path: 'transactions/:id/edit', element: page(() => import('@/pages/transactions/transaction-form-page')) },

      { path: 'transfers', element: page(() => import('@/pages/transfers/transfers-page')) },
      { path: 'transfers/new', element: page(() => import('@/pages/transfers/transfers-page')) },

      { path: 'budgets', element: page(() => import('@/pages/budgets/budgets-list-page')) },
      { path: 'budgets/new', element: page(() => import('@/pages/budgets/budget-form-page')) },
      { path: 'budgets/:id', element: page(() => import('@/pages/budgets/budget-details-page')) },
      { path: 'budgets/:id/edit', element: page(() => import('@/pages/budgets/budget-form-page')) },

      { path: 'recurring', element: page(() => import('@/pages/recurring/recurring-list-page')) },
      { path: 'recurring/new', element: page(() => import('@/pages/recurring/recurring-form-page')) },
      { path: 'recurring/:id/edit', element: page(() => import('@/pages/recurring/recurring-form-page')) },

      { path: 'categories', element: page(() => import('@/pages/categories/categories-page')) },
      { path: 'summary', element: page(() => import('@/pages/summary/monthly-summary-page')) },
      { path: 'reports', element: page(() => import('@/pages/reports/reports-page')) },

      { path: 'import', element: page(() => import('@/pages/import/csv-import-page')) },
      { path: 'import/history', element: page(() => import('@/pages/import/import-history-page')) },

      { path: 'settings', element: page(() => import('@/pages/settings/settings-page')) },

      { path: '*', element: page(() => import('@/pages/errors/not-found-page')) },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'login', element: page(() => import('@/pages/auth/login-page')) },
      { path: 'register', element: page(() => import('@/pages/auth/register-page')) },
    ],
  },
])
