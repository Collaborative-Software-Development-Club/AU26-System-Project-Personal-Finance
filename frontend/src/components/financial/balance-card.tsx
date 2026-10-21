import { Link } from 'react-router'
import { ChevronRight, CreditCard, Landmark, PiggyBank, Wallet, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { isLiabilityAccountType, type AccountType, type AccountWithBalance } from '@/domain'
import { cn } from '@/lib/utils'
import { AccountStatusBadge, AccountTypeBadge } from './badges'
import { MoneyDisplay } from './money-display'

export const ACCOUNT_TYPE_ICON: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Wallet,
  credit: CreditCard,
  other: Wallet,
}

/** Card summarising a single account; links to its details page. */
export function BalanceCard({ account, className, actions }: { account: AccountWithBalance; className?: string; actions?: React.ReactNode }) {
  const Icon = ACCOUNT_TYPE_ICON[account.type]
  const liability = isLiabilityAccountType(account.type)
  return (
    <Card size="sm" className={cn('relative gap-0 transition-shadow hover:shadow-md', account.status === 'archived' && 'opacity-70', className)}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${account.color ?? '#64748b'}1f`, color: account.color ?? undefined }}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/accounts/${account.id}`} className="font-medium hover:underline focus-visible:underline focus-visible:outline-none after:absolute after:inset-0 after:content-['']">
              {account.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <AccountTypeBadge type={account.type} />
              {account.status === 'archived' && <AccountStatusBadge status={account.status} />}
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1">{actions}</div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{liability ? 'Amount owed' : 'Current balance'}</div>
            <MoneyDisplay amount={account.balance} currency={account.currency} size="lg" className={cn(liability && account.balance > 0 && 'text-expense')} />
          </div>
          <span className="flex items-center text-xs text-muted-foreground">
            {account.currency}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
