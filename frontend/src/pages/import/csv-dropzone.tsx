import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineValidationMessage } from '@/components/feedback'
import { CSV_MAX_FILE_BYTES } from '@/domain'
import { cn } from '@/lib/utils'
import { formatFileSize } from './csv-import-logic'

export interface CsvDropzoneProps {
  file: File | null
  onFileSelected(file: File): void
  onRemove(): void
  error?: string | null
  parsing?: boolean
  disabled?: boolean
}

/**
 * Drag-and-drop + file picker for a single CSV file. The drop area is a
 * keyboard-operable button (Enter / Space opens the picker).
 */
export function CsvDropzone({ file, onFileSelected, onRemove, error, parsing = false, disabled = false }: CsvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0]
    if (picked) onFileSelected(picked)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {parsing ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="size-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
              {parsing && ' · Parsing…'}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={disabled || parsing}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} disabled={disabled || parsing} aria-label="Remove file">
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(' ')}
          aria-invalid={!!error || undefined}
          onClick={openPicker}
          onKeyDown={onKeyDown}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors outline-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
            error && 'border-destructive/50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Upload className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Drop a CSV file here, or choose one</p>
            <p id={hintId} className="text-xs text-muted-foreground">
              .csv files only · up to {formatFileSize(CSV_MAX_FILE_BYTES)} · first row must contain column headers
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" tabIndex={-1} className="pointer-events-none">
            Choose file
          </Button>
        </div>
      )}

      <InlineValidationMessage id={errorId} message={error} />
    </div>
  )
}
