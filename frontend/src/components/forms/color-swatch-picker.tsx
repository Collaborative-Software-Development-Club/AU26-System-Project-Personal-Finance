import { Check } from 'lucide-react'
import { COLOR_SWATCHES } from '@/domain'
import { cn } from '@/lib/utils'

export function ColorSwatchPicker({
  id,
  value,
  onChange,
  className,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: {
  id?: string
  value: string
  onChange(color: string): void
  className?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}) {
  return (
    <div id={id} role="radiogroup" aria-label="Colour" aria-describedby={describedBy} aria-invalid={invalid} className={cn('flex flex-wrap gap-2', className)}>
      {COLOR_SWATCHES.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              selected && 'ring-2 ring-foreground',
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-3.5 text-white drop-shadow" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
