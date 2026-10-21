import { forwardRef, type ComponentProps } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange(value: string): void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, className, placeholder = 'Search…', ...props },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" aria-hidden="true" />
      <Input ref={ref} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden" {...props} />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-1.5 my-auto flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
})
