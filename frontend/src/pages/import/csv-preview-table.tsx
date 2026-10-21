import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CSV_PREVIEW_ROWS } from '@/domain'
import type { CsvRow } from './csv-import-logic'

export interface CsvPreviewTableProps {
  headers: string[]
  rows: CsvRow[]
  totalRows: number
  previewCount?: number
}

/** Raw first rows of the file, exactly as parsed, so the user can sanity-check before mapping. */
export function CsvPreviewTable({ headers, rows, totalRows, previewCount = CSV_PREVIEW_ROWS }: CsvPreviewTableProps) {
  const preview = rows.slice(0, previewCount)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground" role="status">
        Showing {preview.length} of {totalRows} data row{totalRows === 1 ? '' : 's'} · {headers.length} column{headers.length === 1 ? '' : 's'} detected
      </p>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-12 text-muted-foreground">
                #
              </TableHead>
              {headers.map((h) => (
                <TableHead key={h} scope="col">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="tabular text-muted-foreground">{i + 1}</TableCell>
                {headers.map((h) => (
                  <TableCell key={h} className="max-w-64 truncate" title={row[h] ?? ''}>
                    {row[h] === '' || row[h] == null ? <span className="text-muted-foreground">—</span> : row[h]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
