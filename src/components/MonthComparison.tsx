import { useI18n } from '../i18n/i18n'
import { formatILS } from '../lib/money'
import type { CategoryChange } from '../lib/summary'
import type { Category } from '../lib/types'
import CategoryIcon from './CategoryIcon'

interface MonthComparisonProps {
  changes: CategoryChange[] // biggest change first
  categories: Category[]
  limit?: number
}

/** The categories whose spending changed the most since last month. The biggest one is highlighted. */
export default function MonthComparison({ changes, categories, limit = 5 }: MonthComparisonProps) {
  const { t, categoryName } = useI18n()
  if (changes.length === 0) return <p className="text-muted">{t('noChanges')}</p>

  return (
    <ol className="flex flex-col gap-2">
      {changes.slice(0, limit).map((c, index) => {
        const category = categories.find((cat) => cat.id === c.categoryId)
        const up = c.change > 0
        return (
          <li
            key={c.categoryId}
            className={`flex items-center gap-3 rounded-xl p-2 ${index === 0 ? 'bg-accent-soft' : ''}`}
          >
            <CategoryIcon category={category} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{categoryName(category)}</div>
              <div className="text-sm text-muted">
                {t('beforeNow', { previous: formatILS(c.previous), current: formatILS(c.current) })}
              </div>
            </div>
            {/* More spending is bad (expense color), less is good (income color); the arrow and words carry it too */}
            <div className={`text-end text-sm font-semibold ${up ? 'text-expense' : 'text-income'}`}>
              <span aria-hidden="true">{up ? '▲ ' : '▼ '}</span>
              {t(up ? 'changeUp' : 'changeDown', { amount: formatILS(Math.abs(c.change)) })}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
