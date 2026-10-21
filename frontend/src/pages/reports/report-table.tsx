import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MoneyDisplay } from '@/components/financial'
import { useFormatters } from '@/hooks'
import { cn } from '@/lib/utils'
import type { ReportCell, ReportTableData } from './report-model'

function CellValue({ cell }: { cell: ReportCell }) {
  const fmt = useFormatters()
  switch (cell.kind) {
    case 'text':
      return <>{cell.value}</>
    case 'month':
      return <>{fmt.month(cell.month)}</>
    case 'date':
      return <>{fmt.date(cell.date)}</>
    case 'money':
      return <MoneyDisplay amount={cell.amount} currency={cell.currency} size="sm" variant={cell.signed ? 'signed' : 'neutral'} />
    case 'percent': {
      if (cell.value === null) return <span className="text-muted-foreground">—</span>
      const rounded = Math.round(cell.value)
      return (
        <span className={cn('tabular', cell.signed && rounded > 0 && 'text-income', cell.signed && rounded < 0 && 'text-expense')}>
          {cell.signed && rounded > 0 ? '+' : ''}
          {rounded}%
        </span>
      )
    }
    case 'count':
      return <span className="tabular">{fmt.number(cell.value)}</span>
  }
}

/** Data table under each report chart. Totals render in a footer row. */
export function ReportTable({ data, caption }: { data: ReportTableData; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {data.columns.map((col) => (
              <TableHead key={col.header} className={cn('first:pl-4 last:pr-4', col.align === 'right' && 'text-right')}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, i) => (
                <TableCell key={i} className={cn('first:pl-4 last:pr-4', data.columns[i]?.align === 'right' && 'text-right')}>
                  <CellValue cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {data.totals && (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              {data.totals.map((cell, i) => (
                <TableCell key={i} className={cn('first:pl-4 last:pr-4 font-semibold', data.columns[i]?.align === 'right' && 'text-right')}>
                  <CellValue cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}
