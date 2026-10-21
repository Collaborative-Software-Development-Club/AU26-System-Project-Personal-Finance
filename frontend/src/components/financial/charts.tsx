/**
 * Chart components built on Recharts.
 *
 * Every chart:
 *  - reads colours from CSS variables so light/dark both work,
 *  - formats money via the user's settings,
 *  - renders an accessible text summary (`<figcaption>` + sr-only table) so
 *    the data is not communicated by graphics alone,
 *  - shows an explicit empty state instead of an empty axis.
 */
import { useId, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategoryTotal, CurrencyCode, DailyPoint, MinorUnits, MonthlyPoint } from '@/domain'
import { formatMonthKey } from '@/domain'
import { useFormatters } from '@/hooks/use-formatters'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/feedback/empty-state'
import { BarChart3 } from 'lucide-react'

const COLORS = {
  income: 'var(--chart-2)',
  expenses: 'var(--chart-3)',
  net: 'var(--chart-1)',
  grid: 'var(--border)',
  text: 'var(--muted-foreground)',
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#0ea5e9', '#db2777', '#0f766e']

function useAxisMoney(currency: CurrencyCode | null | undefined) {
  const fmt = useFormatters()
  return (v: number) => fmt.money(v as MinorUnits, currency, { compact: true })
}

interface ChartFrameProps {
  title?: string
  description?: string
  summary: string
  height?: number
  isEmpty: boolean
  emptyTitle?: string
  emptyDescription?: string
  children: ReactNode
  table?: ReactNode
  className?: string
}

/** Shared wrapper: title, accessible summary, empty state and sr-only data table. */
export function ChartFrame({ title, description, summary, height = 260, isEmpty, emptyTitle = 'No data for this period', emptyDescription, children, table, className }: ChartFrameProps) {
  const id = useId()
  return (
    <figure className={cn('flex flex-col gap-2', className)} aria-labelledby={title ? `${id}-title` : undefined} aria-describedby={`${id}-summary`}>
      {(title || description) && (
        <div>
          {title && (
            <h3 id={`${id}-title`} className="text-sm font-semibold">
              {title}
            </h3>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {isEmpty ? (
        <EmptyState icon={BarChart3} size="sm" title={emptyTitle} description={emptyDescription} className="min-h-[200px]" />
      ) : (
        <div style={{ height }} role="img" aria-label={summary}>
          {children}
        </div>
      )}
      <figcaption id={`${id}-summary`} className="sr-only">
        {summary}
      </figcaption>
      {!isEmpty && table && <div className="sr-only">{table}</div>}
    </figure>
  )
}

const tooltipStyle = {
  contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 },
  labelStyle: { color: 'var(--popover-foreground)', fontWeight: 600 },
  itemStyle: { color: 'var(--popover-foreground)' },
  cursor: { fill: 'var(--muted)', opacity: 0.5 },
}

// ---------------------------------------------------------------------------
// Income vs Expenses (monthly, grouped bars)
// ---------------------------------------------------------------------------

export function IncomeExpenseChart({ data, currency, title, description, height, className, showNet = false }: { data: MonthlyPoint[]; currency?: CurrencyCode | null; title?: string; description?: string; height?: number; className?: string; showNet?: boolean }) {
  const fmt = useFormatters()
  const axis = useAxisMoney(currency)
  const isEmpty = data.every((d) => d.income === 0 && d.expenses === 0)
  const totalIncome = data.reduce((s, d) => s + d.income, 0)
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)
  const summary = isEmpty
    ? 'No income or expenses recorded in this period.'
    : `Income versus expenses over ${data.length} months. Total income ${fmt.money(totalIncome, currency)}, total expenses ${fmt.money(totalExpenses, currency)}.`
  return (
    <ChartFrame
      title={title}
      description={description}
      summary={summary}
      height={height}
      isEmpty={isEmpty}
      className={className}
      table={
        <table>
          <caption>Income and expenses by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{formatMonthKey(d.month)}</td>
                <td>{fmt.money(d.income, currency)}</td>
                <td>{fmt.money(d.expenses, currency)}</td>
                <td>{fmt.money(d.net, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="month" tickFormatter={(m: string) => formatMonthKey(m, 'short')} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={axis} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip {...tooltipStyle} formatter={(v) => fmt.money(Number(v), currency)} labelFormatter={(m) => formatMonthKey(String(m))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill={COLORS.income} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="expenses" name="Expenses" fill={COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={36} />
          {showNet && <Line type="monotone" dataKey="net" name="Net" stroke={COLORS.net} strokeWidth={2} dot={false} />}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// ---------------------------------------------------------------------------
// Net cash flow / trend line
// ---------------------------------------------------------------------------

export function TrendLineChart({ data, currency, title, description, height, className }: { data: { label: string; value: MinorUnits }[]; currency?: CurrencyCode | null; title?: string; description?: string; height?: number; className?: string }) {
  const fmt = useFormatters()
  const axis = useAxisMoney(currency)
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0)
  const summary = isEmpty ? 'No data to plot.' : `${title ?? 'Trend'} across ${data.length} points, from ${fmt.money(data[0]!.value, currency)} to ${fmt.money(data[data.length - 1]!.value, currency)}.`
  return (
    <ChartFrame title={title} description={description} summary={summary} height={height} isEmpty={isEmpty} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={axis} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip {...tooltipStyle} formatter={(v) => fmt.money(Number(v), currency)} />
          <Line type="monotone" dataKey="value" name={title ?? 'Value'} stroke={COLORS.net} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// ---------------------------------------------------------------------------
// Daily activity (within a month)
// ---------------------------------------------------------------------------

export function DailyActivityChart({ data, currency, title, description, height, className }: { data: DailyPoint[]; currency?: CurrencyCode | null; title?: string; description?: string; height?: number; className?: string }) {
  const fmt = useFormatters()
  const axis = useAxisMoney(currency)
  const isEmpty = data.every((d) => d.income === 0 && d.expenses === 0)
  const summary = isEmpty ? 'No daily activity in this month.' : `Daily income and expenses for ${data.length} days.`
  return (
    <ChartFrame title={title} description={description} summary={summary} height={height} isEmpty={isEmpty} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => String(Number(d.slice(-2)))} tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
          <YAxis tickFormatter={axis} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip {...tooltipStyle} formatter={(v) => fmt.money(Number(v), currency)} labelFormatter={(d) => fmt.date(String(d))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" stackId="a" fill={COLORS.income} maxBarSize={18} />
          <Bar dataKey="expenses" name="Expenses" stackId="b" fill={COLORS.expenses} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

// ---------------------------------------------------------------------------
// Category breakdown (donut or horizontal bars)
// ---------------------------------------------------------------------------

export function CategoryBreakdownChart({
  data,
  currency,
  title,
  description,
  height = 260,
  variant = 'donut',
  onSelect,
  className,
  maxSlices = 6,
}: {
  data: CategoryTotal[]
  currency?: CurrencyCode | null
  title?: string
  description?: string
  height?: number
  variant?: 'donut' | 'bars'
  onSelect?(categoryId: string | null): void
  className?: string
  maxSlices?: number
}) {
  const fmt = useFormatters()
  const axis = useAxisMoney(currency)
  const isEmpty = data.length === 0 || data.every((d) => d.total === 0)

  // Collapse the long tail into "Other" so the donut stays readable.
  const top = data.slice(0, maxSlices)
  const rest = data.slice(maxSlices)
  const restTotal = rest.reduce((s, d) => s + d.total, 0)
  const rows = rest.length > 0 ? [...top, { categoryId: null, category: null, total: restTotal, count: rest.reduce((s, d) => s + d.count, 0), share: rest.reduce((s, d) => s + d.share, 0) } as CategoryTotal] : top
  const chartData = rows.map((r, i) => ({
    id: r.categoryId ?? '__other__',
    name: r.category?.name ?? (r.categoryId === null && rest.length > 0 && i === rows.length - 1 ? 'Other' : 'Uncategorised'),
    value: r.total,
    share: r.share,
    color: r.category?.color ?? PALETTE[i % PALETTE.length],
  }))
  const grand = data.reduce((s, d) => s + d.total, 0)
  const summary = isEmpty
    ? 'No spending recorded for this period.'
    : `Spending by category, total ${fmt.money(grand, currency)}. Largest: ${chartData[0]?.name} at ${fmt.money(chartData[0]?.value ?? 0, currency)} (${Math.round(chartData[0]?.share ?? 0)}%).`

  const table = (
    <table>
      <caption>Spending by category</caption>
      <thead>
        <tr>
          <th>Category</th>
          <th>Amount</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        {chartData.map((d) => (
          <tr key={d.id}>
            <td>{d.name}</td>
            <td>{fmt.money(d.value, currency)}</td>
            <td>{Math.round(d.share)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const handleClick = (id: string) => onSelect?.(id === '__other__' ? null : id)

  if (variant === 'bars') {
    return (
      <ChartFrame title={title} description={description} summary={summary} height={Math.max(height, chartData.length * 36 + 24)} isEmpty={isEmpty} className={className} table={table}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={axis} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmt.money(Number(v), currency)} />
            <Bar dataKey="value" name="Spent" radius={[0, 4, 4, 0]} maxBarSize={22} onClick={(d) => handleClick(String((d as unknown as { id: string }).id))} cursor={onSelect ? 'pointer' : undefined}>
              {chartData.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title={title} description={description} summary={summary} height={height} isEmpty={isEmpty} className={className} table={table}>
      <div className="flex h-full flex-col items-center gap-2 sm:flex-row">
        <div className="h-full min-h-[180px] w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} startAngle={90} endAngle={-270} stroke="var(--card)" onClick={(d) => handleClick(String((d as unknown as { id: string }).id))} cursor={onSelect ? 'pointer' : undefined}>
                {chartData.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v, _n, item) => [`${fmt.money(Number(v), currency)} (${Math.round((item?.payload as { share?: number })?.share ?? 0)}%)`, (item?.payload as { name?: string })?.name ?? '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full flex-1 space-y-1.5 text-sm sm:w-1/2">
          {chartData.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => handleClick(d.id)}
                disabled={!onSelect}
                className={cn('flex w-full items-center gap-2 rounded px-1 py-0.5 text-left', onSelect && 'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <span className="tabular text-muted-foreground">{Math.round(d.share)}%</span>
                <span className="tabular w-24 text-right font-medium">{fmt.money(d.value, currency, { compact: true })}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  )
}

// ---------------------------------------------------------------------------
// Budget vs actual (grouped horizontal bars)
// ---------------------------------------------------------------------------

export function BudgetVsActualChart({ data, currency, title, description, height = 260, className }: { data: { name: string; budgeted: MinorUnits; spent: MinorUnits }[]; currency?: CurrencyCode | null; title?: string; description?: string; height?: number; className?: string }) {
  const fmt = useFormatters()
  const axis = useAxisMoney(currency)
  const isEmpty = data.length === 0
  const summary = isEmpty ? 'No budgets for this period.' : `Budgeted versus actual spending for ${data.length} budgets.`
  return (
    <ChartFrame title={title} description={description} summary={summary} height={Math.max(height, data.length * 44 + 24)} isEmpty={isEmpty} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" tickFormatter={axis} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fill: COLORS.text, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => fmt.money(Number(v), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="budgeted" name="Budgeted" fill={COLORS.net} radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="spent" name="Spent" fill={COLORS.expenses} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
