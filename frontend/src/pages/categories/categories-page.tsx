import { useMemo, useState } from 'react'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageContainer } from '@/components/layout/page-container'
import { usePageHeader } from '@/components/layout/page-header-context'
import { AccountStatusBadge, ColorDot } from '@/components/financial'
import { FormField, SelectInput, type SelectOption } from '@/components/forms'
import { ConfirmDialog, EmptyState, FormErrorMessage, InlineValidationMessage, PendingOperationIndicator, toast } from '@/components/feedback'
import type { Category, CategoryType, Id } from '@/domain'
import { useAsyncAction, useFormatters } from '@/hooks'
import { useActiveCategories, useCategories, useFinanceStore, useIsPending, useTransactionCountByCategory } from '@/store'
import { CategoryFormDialog, type CategoryEditor } from './category-form-dialog'

type TabValue = 'expense' | 'income'

const TYPE_LABEL: Record<CategoryType, string> = { expense: 'Expense', income: 'Income', both: 'Income & expense' }

function matchesTab(category: Category, tab: TabValue): boolean {
  return category.type === 'both' || category.type === tab
}

export default function CategoriesPage() {
  const categories = useCategories()
  const recurringRules = useFinanceStore((s) => s.recurringRules)
  const txCounts = useTransactionCountByCategory()

  const [tab, setTab] = useState<TabValue>('expense')
  const [editor, setEditor] = useState<CategoryEditor | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  usePageHeader({
    title: 'Categories',
    description: 'Organise transactions into groups for budgets and reports.',
    actions: (
      <Button onClick={() => setEditor({ mode: 'create', type: tab })}>
        <Plus aria-hidden="true" />
        Add category
      </Button>
    ),
  })

  const ruleCounts = useMemo(() => {
    const counts = new Map<Id, number>()
    for (const r of recurringRules) counts.set(r.categoryId, (counts.get(r.categoryId) ?? 0) + 1)
    return counts
  }, [recurringRules])

  const visible = useMemo(
    () =>
      categories
        .filter((c) => matchesTab(c, tab))
        .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'active' ? -1 : 1)),
    [categories, tab],
  )
  const activeCount = visible.filter((c) => c.status === 'active').length

  const editorKey = editor ? (editor.mode === 'edit' ? editor.category.id : `new-${editor.type}`) : null

  return (
    <PageContainer>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Category type">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {visible.length - activeCount} archived
          </p>
        </div>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={`No ${tab} categories`}
          description={
            tab === 'expense'
              ? 'Expense categories let you budget and see where money goes. Create one to start grouping spending.'
              : 'Income categories separate salary, freelance and other sources in your reports.'
          }
          action={
            <Button onClick={() => setEditor({ mode: 'create', type: tab })}>
              <Plus aria-hidden="true" />
              Add {tab} category
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  transactionCount={txCounts.get(category.id) ?? 0}
                  onEdit={() => setEditor({ mode: 'edit', category })}
                  onDelete={() => setDeleting(category)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editor && editorKey && <CategoryFormDialog key={editorKey} editor={editor} open onOpenChange={(open) => !open && setEditor(null)} />}

      {deleting && (
        <DeleteCategoryDialog
          key={deleting.id}
          category={deleting}
          transactionCount={txCounts.get(deleting.id) ?? 0}
          ruleCount={ruleCounts.get(deleting.id) ?? 0}
          onClose={() => setDeleting(null)}
        />
      )}
    </PageContainer>
  )
}

function CategoryRow({
  category,
  transactionCount,
  onEdit,
  onDelete,
}: {
  category: Category
  transactionCount: number
  onEdit(): void
  onDelete(): void
}) {
  const fmt = useFormatters()
  const setCategoryStatus = useFinanceStore((s) => s.setCategoryStatus)
  const statusPending = useIsPending(`categoryStatus:${category.id}`)
  const deletePending = useIsPending(`deleteCategory:${category.id}`)
  const busy = statusPending || deletePending

  // One action per row so two rows can be updated independently.
  const statusAction = useAsyncAction(async (status: Category['status']) => setCategoryStatus(category.id, status))
  const toggleStatus = async () => {
    const next = category.status === 'active' ? 'archived' : 'active'
    const result = await statusAction.run(next)
    if (result) toast.success(next === 'archived' ? 'Category archived' : 'Category restored', { description: result.name })
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <ColorDot color={category.color} className="size-3" />
          <span className="truncate font-medium">{category.name}</span>
          {category.icon && <span className="hidden text-xs text-muted-foreground md:inline">({category.icon})</span>}
        </div>
        <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">{TYPE_LABEL[category.type]}</span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary">{TYPE_LABEL[category.type]}</Badge>
      </TableCell>
      <TableCell>
        {busy ? <PendingOperationIndicator label={deletePending ? 'Deleting…' : 'Updating…'} /> : <AccountStatusBadge status={category.status} />}
        {statusAction.status === 'error' && <InlineValidationMessage message={statusAction.error} className="mt-1 whitespace-normal" />}
      </TableCell>
      <TableCell className="tabular text-right">{fmt.number(transactionCount)}</TableCell>
      <TableCell className="p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${category.name}`} disabled={busy}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleStatus}>
              {category.status === 'active' ? (
                <>
                  <Archive aria-hidden="true" /> Archive
                </>
              ) : (
                <>
                  <ArchiveRestore aria-hidden="true" /> Restore
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 aria-hidden="true" /> Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

/**
 * Delete confirmation. When the category is in use, the user must pick a
 * replacement of the same type (excluding the category itself) so no history
 * is lost — the API rejects deletion without one.
 */
function DeleteCategoryDialog({
  category,
  transactionCount,
  ruleCount,
  onClose,
}: {
  category: Category
  transactionCount: number
  ruleCount: number
  onClose(): void
}) {
  const fmt = useFormatters()
  const deleteCategory = useFinanceStore((s) => s.deleteCategory)
  const candidates = useActiveCategories(category.type === 'both' ? undefined : category.type)
  const options = useMemo<SelectOption[]>(
    () => candidates.filter((c) => c.id !== category.id).map((c) => ({ value: c.id, label: c.name, icon: <ColorDot color={c.color} /> })),
    [candidates, category.id],
  )
  const inUse = transactionCount + ruleCount > 0
  const [reassignTo, setReassignTo] = useState<Id | ''>('')
  const [touched, setTouched] = useState(false)
  const remove = useAsyncAction(async (id: Id, target: Id | null) => deleteCategory(id, target))

  const usage = [
    transactionCount > 0 ? `${fmt.number(transactionCount)} transaction${transactionCount === 1 ? '' : 's'}` : null,
    ruleCount > 0 ? `${fmt.number(ruleCount)} recurring rule${ruleCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' and ')

  const onConfirm = async () => {
    setTouched(true)
    if (inUse && !reassignTo) return
    const result = await remove.run(category.id, inUse ? reassignTo : null)
    if (!result) return
    const targetName = options.find((o) => o.value === reassignTo)?.label
    const moved = result.reassignedTransactionIds.length
    toast.success('Category deleted', {
      description: moved > 0 ? `${fmt.number(moved)} transaction${moved === 1 ? '' : 's'} moved to ${targetName ?? 'another category'}.` : `“${category.name}” was removed.`,
    })
    onClose()
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Delete “${category.name}”?`}
      description={
        inUse
          ? `This category is used by ${usage}. Choose where to move them — transaction history is never removed silently. Budgets for this category will be deleted.`
          : 'This category is not used by any transaction. This cannot be undone.'
      }
      confirmLabel={inUse ? 'Reassign and delete' : 'Delete category'}
      destructive
      pending={remove.isPending}
      confirmDisabled={inUse && options.length === 0}
      onConfirm={onConfirm}
    >
      <div className="flex flex-col gap-3">
        {inUse && (
          <FormField label="Move transactions to" required error={touched && !reassignTo ? 'Select a category to move the transactions to.' : undefined}>
            <SelectInput value={reassignTo} onChange={setReassignTo} options={options} placeholder={options.length === 0 ? 'No other category available' : 'Select category'} disabled={options.length === 0} />
          </FormField>
        )}
        {inUse && options.length === 0 && (
          <p className="text-sm text-muted-foreground">Create another {category.type === 'both' ? '' : `${category.type} `}category first, or archive this one instead.</p>
        )}
        {remove.status === 'error' && <FormErrorMessage message={remove.error} />}
      </div>
    </ConfirmDialog>
  )
}
