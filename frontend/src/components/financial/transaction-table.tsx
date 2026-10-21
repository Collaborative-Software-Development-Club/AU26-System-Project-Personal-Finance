import { useNavigate } from 'react-router'
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Account, Category, Id, Transaction } from '@/domain'
import { useFormatters } from '@/hooks/use-formatters'
import { cn } from '@/lib/utils'
import { CategoryChip, TransactionTypeBadge } from './badges'
import { MoneyDisplay } from './money-display'

export type TransactionSortKey = 'date' | 'description' | 'amount' | 'account' | 'category'
export interface TransactionSort {
  key: TransactionSortKey
  direction: 'asc' | 'desc'
}

export interface TransactionTableProps {
  transactions: Transaction[]
  accounts: Map<Id, Account>
  categories: Map<Id, Category>
  /** Hide the account column (e.g. on Account Details). */
  hideAccount?: boolean
  /** Show row action menu (view / edit / delete). */
  actions?: boolean
  onEdit?(tx: Transaction): void
  onDelete?(tx: Transaction): void
  sort?: TransactionSort
  onSortChange?(sort: TransactionSort): void
  /** Rendered inside the table body when there are no rows. */
  emptyContent?: React.ReactNode
  className?: string
  /** Compact density for dashboard panels. */
  dense?: boolean
}

/**
 * Sorts transactions deterministically: by the requested key, then by date,
 * createdAt and id so equal keys never shuffle.
 */
export function sortTransactions(list: Transaction[], sort: TransactionSort, accounts: Map<Id, Account>, categories: Map<Id, Category>): Transaction[] {
  const dir = sort.direction === 'asc' ? 1 : -1
  const key = (t: Transaction): string | number => {
    switch (sort.key) {
      case 'date':
        return t.date
      case 'description':
        return t.description.toLowerCase()
      case 'amount':
        return t.amount
      case 'account':
        return (accounts.get(t.accountId)?.name ?? '').toLowerCase()
      case 'category':
        return (categories.get(t.categoryId ?? '')?.name ?? '').toLowerCase()
    }
  }
  return [...list].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    const primary = ka < kb ? -1 : ka > kb ? 1 : 0
    if (primary !== 0) return primary * dir
    return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  })
}

function SortButton({ label, active, direction, onClick, align = 'left' }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick(): void; align?: 'left' | 'right' }) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('-mx-1 inline-flex h-7 items-center gap-1 rounded px-1 text-xs font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', align === 'right' && 'flex-row-reverse', active ? 'text-foreground' : 'text-muted-foreground')}
      aria-label={`Sort by ${label}${active ? `, currently ${direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
    >
      {label}
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

/** Shared transaction list. Click a row to open details; keyboard accessible. */
export function TransactionTable({
  transactions,
  accounts,
  categories,
  hideAccount,
  actions = true,
  onEdit,
  onDelete,
  sort,
  onSortChange,
  emptyContent,
  className,
  dense,
}: TransactionTableProps) {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const sortable = !!sort && !!onSortChange

  const header = (key: TransactionSortKey, label: string, align: 'left' | 'right' = 'left') => {
    if (!sortable) return <span className="text-xs font-medium text-muted-foreground">{label}</span>
    return (
      <SortButton
        label={label}
        align={align}
        active={sort.key === key}
        direction={sort.direction}
        onClick={() => onSortChange({ key, direction: sort.key === key && sort.direction === 'desc' ? 'asc' : 'desc' })}
      />
    )
  }

  const open = (tx: Transaction) => navigate(`/transactions/${tx.id}`)
  const colCount = 5 - (hideAccount ? 1 : 0) + (actions ? 1 : 0)

  return (
    <div className={cn('overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28">{header('date', 'Date')}</TableHead>
            <TableHead>{header('description', 'Description')}</TableHead>
            <TableHead className="hidden md:table-cell">{header('category', 'Category')}</TableHead>
            {!hideAccount && <TableHead className="hidden lg:table-cell">{header('account', 'Account')}</TableHead>}
            <TableHead className="text-right">{header('amount', 'Amount', 'right')}</TableHead>
            {actions && (
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="p-0">
                {emptyContent ?? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No transactions.</div>}
              </TableCell>
            </TableRow>
          )}
          {transactions.map((tx) => {
            const account = accounts.get(tx.accountId)
            const category = tx.categoryId ? categories.get(tx.categoryId) : null
            return (
              <TableRow
                key={tx.id}
                tabIndex={0}
                role="link"
                aria-label={`${tx.description}, ${fmt.money(tx.amount, tx.currency)} on ${fmt.date(tx.date)}`}
                onClick={() => open(tx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    open(tx)
                  }
                }}
                className={cn('cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none', dense && '[&>td]:py-1.5')}
              >
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">{fmt.date(tx.date)}</TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">{tx.description}</span>
                    <span className="flex items-center gap-1.5 md:hidden">
                      <TransactionTypeBadge type={tx.type} direction={tx.transferDirection} className="h-5 px-1.5 text-[10px]" />
                      {category && <CategoryChip category={category} className="text-xs text-muted-foreground" />}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {tx.type === 'transfer' ? <TransactionTypeBadge type="transfer" direction={tx.transferDirection} /> : <CategoryChip category={category} />}
                </TableCell>
                {!hideAccount && <TableCell className="hidden truncate text-muted-foreground lg:table-cell">{account?.name ?? 'Unknown account'}</TableCell>}
                <TableCell className="text-right">
                  <MoneyDisplay amount={tx.amount} currency={tx.currency} variant="type" type={tx.type} transferDirection={tx.transferDirection} size="sm" className="font-medium" />
                </TableCell>
                {actions && (
                  <TableCell className="p-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${tx.description}`}>
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => open(tx)}>
                          <Eye aria-hidden="true" /> View details
                        </DropdownMenuItem>
                        {onEdit && tx.type !== 'transfer' && (
                          <DropdownMenuItem onSelect={() => onEdit(tx)}>
                            <Pencil aria-hidden="true" /> Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(tx)}>
                              <Trash2 aria-hidden="true" /> {tx.type === 'transfer' ? 'Delete transfer…' : 'Delete'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
