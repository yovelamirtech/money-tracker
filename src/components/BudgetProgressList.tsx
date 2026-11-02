import { useI18n } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import type { BudgetLevel, BudgetProgress } from '../lib/budget'
import { formatILS } from '../lib/money'
import type { Category } from '../lib/types'

interface BudgetProgressListProps {
  progress: BudgetProgress[]
  categories: Category[]
}

// Status always comes as icon + label, never color alone. Calm amber shades, never red.
const levels: Record<BudgetLevel, { icon: string; label: MessageKey; fill: string; text: string }> = {
  ok: { icon: '✓', label: 'levelOk', fill: 'bg-chart-bar', text: 'text-muted' },
  near: { icon: '⏳', label: 'levelNear', fill: 'bg-status-near', text: 'text-warn' },
  over: { icon: '⚠️', label: 'levelOver', fill: 'bg-status-over', text: 'text-warn' },
}

export default function BudgetProgressList({ progress, categories }: BudgetProgressListProps) {
  const { t, categoryName } = useI18n()

  return (
    <ul className="flex flex-col gap-4">
      {progress.map((p) => {
        const name = categoryName(categories.find((c) => c.id === p.categoryId))
        const level = levels[p.level]
        return (
          <li key={p.categoryId}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{name}</span>
              <span className={`text-sm font-semibold ${level.text}`}>
                <span aria-hidden="true">{level.icon} </span>
                {t(level.label)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(p.percent, 100)}
              aria-valuetext={`${p.percent}%`}
              className="mt-1 h-3 overflow-hidden rounded-full bg-meter-track"
            >
              <div className={`h-full rounded-full ${level.fill}`} style={{ width: `${Math.min(p.percent, 100)}%` }} />
            </div>
            <div className="mt-1 flex justify-between gap-2 text-sm text-muted">
              <span>
                {t('budgetSpentOf', { spent: formatILS(p.spent), limit: formatILS(p.limit) })} ({p.percent}%)
              </span>
              <span className="shrink-0 text-end">
                {p.remaining >= 0
                  ? t('budgetLeft', { amount: formatILS(p.remaining) })
                  : t('budgetOverBy', { amount: formatILS(-p.remaining) })}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
