import { useI18n } from '../i18n/i18n'
import { percentOf } from '../lib/chart'
import { formatILS } from '../lib/money'
import type { CategoryTotal } from '../lib/summary'
import type { Category } from '../lib/types'
import CategoryIcon from './CategoryIcon'

interface CategoryChartProps {
  totals: CategoryTotal[] // expenses only, biggest first
  categories: Category[]
}

/** Horizontal bars, one per category, growing from the start side. Values sit at the bar tips. */
export default function CategoryChart({ totals, categories }: CategoryChartProps) {
  const { t, categoryName } = useI18n()
  if (totals.length === 0) return <p className="py-6 text-center text-muted">{t('noExpenses')}</p>

  const max = totals[0].total
  const sum = totals.reduce((s, c) => s + c.total, 0)
  const rows = totals.map((c) => {
    const category = categories.find((cat) => cat.id === c.categoryId)
    return { ...c, category, name: categoryName(category), share: percentOf(c.total, sum) }
  })

  return (
    <div>
      <ul aria-label={t('spendingByCategory')} className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.categoryId} className="flex items-center gap-2" title={`${row.name}: ${formatILS(row.total)} (${row.share}%)`}>
            <CategoryIcon category={row.category} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{row.name}</span>
                <span dir="ltr" className="shrink-0 tabular-nums text-muted">
                  {formatILS(row.total)} · {row.share}%
                </span>
              </div>
              <div className="mt-1 h-3" aria-hidden="true">
                <div
                  className="h-full rounded-e-[4px] bg-chart-bar"
                  style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-accent-text">{t('showAsTable')}</summary>
        <table className="mt-2 w-full text-start">
          <thead className="text-muted">
            <tr>
              <th className="py-1 text-start font-medium">{t('category')}</th>
              <th className="py-1 text-end font-medium">{t('amount')}</th>
              <th className="py-1 text-end font-medium">{t('share')}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => (
              <tr key={row.categoryId} className="border-t border-line">
                <td className="py-1">{row.name}</td>
                <td dir="ltr" className="py-1 text-start rtl:text-end">
                  {formatILS(row.total)}
                </td>
                <td className="py-1 text-end">{row.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
