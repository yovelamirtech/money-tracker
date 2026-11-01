import { useI18n } from '../i18n/i18n'
import type { BudgetProgress } from '../lib/budget'
import type { Category } from '../lib/types'

interface BudgetAlertsProps {
  progress: BudgetProgress[]
  categories: Category[]
  onOpen: () => void
}

/** A short warning on the month screen when a budget is near or over its limit. */
export default function BudgetAlerts({ progress, categories, onOpen }: BudgetAlertsProps) {
  const { t, categoryName } = useI18n()
  const names = (level: BudgetProgress['level']) =>
    progress
      .filter((p) => p.level === level)
      .map((p) => categoryName(categories.find((c) => c.id === p.categoryId)))
      .join(', ')

  const over = names('over')
  const near = names('near')
  if (!over && !near) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-1 rounded-2xl bg-warn-soft p-3 text-start text-fg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {over && (
        <span className="font-semibold">
          <span aria-hidden="true">⛔ </span>
          {t('budgetOverWarning', { names: over })}
        </span>
      )}
      {near && (
        <span>
          <span aria-hidden="true">⚠️ </span>
          {t('budgetNearWarning', { names: near })}
        </span>
      )}
    </button>
  )
}
