import { useState, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { ColorSwatchPicker, FormField, SelectInput } from '@/components/forms'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { COLOR_SWATCHES, hasErrors, validateCategory, type Category, type CategoryFormValues, type CategoryType, type FieldErrors } from '@/domain'
import { useAsyncAction } from '@/hooks'
import { useCategories, useFinanceStore } from '@/store'

/** Input shape of the store's create/update actions (pages never import `@/api`). */
type CategoryInput = Parameters<ReturnType<typeof useFinanceStore.getState>['createCategory']>[0]

const TYPE_OPTIONS: { value: CategoryType; label: string; description: string }[] = [
  { value: 'expense', label: 'Expense', description: 'Money going out' },
  { value: 'income', label: 'Income', description: 'Money coming in' },
  { value: 'both', label: 'Both', description: 'Usable for either' },
]

export type CategoryEditor = { mode: 'create'; type: CategoryType } | { mode: 'edit'; category: Category }

function initialValues(editor: CategoryEditor): CategoryFormValues {
  if (editor.mode === 'edit') {
    const { name, type, color, icon } = editor.category
    return { name, type, color, icon: icon ?? '' }
  }
  return { name: '', type: editor.type, color: COLOR_SWATCHES[0], icon: '' }
}

function toInput(values: CategoryFormValues): CategoryInput {
  return {
    name: values.name.trim(),
    type: values.type as CategoryType,
    color: values.color,
    icon: values.icon.trim() || null,
  }
}

/**
 * Create / edit a category inline (not a route). Mount with a `key` that
 * changes per editor target so the form state resets.
 */
export function CategoryFormDialog({ editor, open, onOpenChange }: { editor: CategoryEditor; open: boolean; onOpenChange(open: boolean): void }) {
  const categories = useCategories()
  const createCategory = useFinanceStore((s) => s.createCategory)
  const updateCategory = useFinanceStore((s) => s.updateCategory)
  const editingId = editor.mode === 'edit' ? editor.category.id : null

  const [values, setValues] = useState<CategoryFormValues>(() => initialValues(editor))
  const [errors, setErrors] = useState<FieldErrors<keyof CategoryFormValues>>({})
  const save = useAsyncAction(async (input: CategoryInput) => (editingId ? updateCategory(editingId, input) : createCategory(input)))

  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => setValues((v) => ({ ...v, [key]: value }))
  const fieldError = (key: keyof CategoryFormValues) => errors[key] ?? (save.fieldErrors[key] ? save.error ?? save.fieldErrors[key] : undefined)
  const hasApiFieldError = Object.keys(save.fieldErrors).length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateCategory(values, { categories, editingId })
    setErrors(errs)
    if (hasErrors(errs)) return
    const result = await save.run(toInput(values))
    if (result) {
      toast.success(editingId ? 'Category updated' : 'Category created', { description: result.name })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!save.isPending ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Changes apply to every transaction already using this category.' : 'Categories group transactions for budgets and reports.'}
            </DialogDescription>
          </DialogHeader>

          <FormField label="Name" required error={fieldError('name')}>
            <Input value={values.name} onChange={(e) => set('name', e.target.value)} autoFocus maxLength={200} autoComplete="off" />
          </FormField>

          <FormField label="Type" required error={fieldError('type')} description="Determines which transaction forms offer this category.">
            <SelectInput<CategoryType> value={values.type} onChange={(v) => set('type', v)} options={TYPE_OPTIONS} />
          </FormField>

          <FormField label="Colour" required error={fieldError('color')}>
            <ColorSwatchPicker value={values.color} onChange={(c) => set('color', c)} />
          </FormField>

          <FormField label="Icon name" hintLabel="(optional)" error={fieldError('icon')} description="A lucide icon name, e.g. “shopping-cart”.">
            <Input value={values.icon} onChange={(e) => set('icon', e.target.value)} maxLength={60} autoComplete="off" />
          </FormField>

          {save.status === 'error' && !hasApiFieldError && <FormErrorMessage message={save.error} />}
          {save.status === 'unknown' && <OutcomeUnknownNotice description="The request was sent but no confirmation came back. Close this dialog and check the list before trying again." />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
