import CategoryIcon from '../components/CategoryIcon'
import ScreenHeader from '../components/ScreenHeader'
import { iconButton, secondaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { formatILS } from '../lib/money'
import type { Category, RecurringRule } from '../lib/types'

interface RecurringScreenProps {
  rules: RecurringRule[]
  categories: Category[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onBack: () => void
}

export default function RecurringScreen({ rules, categories, onToggle, onDelete, onBack }: RecurringScreenProps) {
  const { t, categoryName } = useI18n()

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('recurringTitle')} onBack={onBack} />

      {rules.length === 0 ? (
        <p className="py-10 text-center text-muted">{t('noRecurring')}</p>
      ) : (
        <ul aria-label={t('recurringTitle')} className="divide-y divide-line rounded-2xl bg-card shadow-sm">
          {rules.map((rule) => {
            const category = categories.find((c) => c.id === rule.categoryId)
            const name = rule.note ? `${categoryName(category)} · ${rule.note}` : categoryName(category)
            const isIncome = rule.type === 'income'
            return (
              <li key={rule.id} className={`flex flex-col gap-2 p-3 ${rule.active ? '' : 'opacity-75'}`}>
                <div className="flex items-center gap-3">
                  <CategoryIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="text-sm text-muted">
                      {t('dayOfMonth', { day: rule.dayOfMonth })}
                      {!rule.active && ` · ${t('paused')}`}
                    </div>
                  </div>
                  <span dir="ltr" className={`font-semibold ${isIncome ? 'text-income' : 'text-expense'}`}>
                    {isIncome ? '+' : '-'}
                    {formatILS(rule.amountAgorot)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={t(rule.active ? 'pauseRule' : 'resumeRule', { name })}
                    onClick={() => onToggle(rule.id)}
                    className={`${secondaryButton} flex-1 text-base`}
                  >
                    {t(rule.active ? 'pause' : 'resume')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('deleteRule', { name })}
                    onClick={() => {
                      if (window.confirm(t('confirmDeleteRule', { name }))) onDelete(rule.id)
                    }}
                    className={`${iconButton} hover:bg-danger-soft hover:text-expense`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
