import { useState, type FormEvent } from 'react'
import CategoryIcon from '../components/CategoryIcon'
import ScreenHeader from '../components/ScreenHeader'
import { fieldClass, primaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { parseAmount, toDecimalString } from '../lib/money'
import type { Budget, Category } from '../lib/types'

interface BudgetsScreenProps {
  budgets: Budget[]
  categories: Category[]
  onSave: (budgets: Budget[]) => void
  onBack: () => void
}

export default function BudgetsScreen({ budgets, categories, onSave, onBack }: BudgetsScreenProps) {
  const { t, categoryName } = useI18n()
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(budgets.map((b) => [b.categoryId, toDecimalString(b.limitAgorot)])),
  )
  const [invalid, setInvalid] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Budget[] = []
    const bad: string[] = []
    for (const category of expenseCategories) {
      const input = (inputs[category.id] ?? '').trim()
      if (input === '') continue
      const limitAgorot = parseAmount(input)
      if (limitAgorot === null) bad.push(category.id)
      else next.push({ categoryId: category.id, limitAgorot })
    }
    setInvalid(bad)
    if (bad.length > 0) {
      setSaved(false)
      return
    }
    onSave(next)
    setSaved(true)
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('budgetsTitle')} onBack={onBack} />
      <p className="text-muted">{t('budgetsHint')}</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
          {expenseCategories.map((category) => {
            const name = categoryName(category)
            const isInvalid = invalid.includes(category.id)
            return (
              <li key={category.id} className="flex items-center gap-3">
                <CategoryIcon category={category} />
                <label htmlFor={`budget-${category.id}`} className="flex-1 font-medium">
                  {name}
                </label>
                <div className="w-36">
                  <input
                    id={`budget-${category.id}`}
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    autoComplete="off"
                    placeholder="₪"
                    aria-label={t('budgetFor', { name })}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `budget-${category.id}-error` : undefined}
                    value={inputs[category.id] ?? ''}
                    onChange={(e) => {
                      setInputs({ ...inputs, [category.id]: e.target.value })
                      setSaved(false)
                    }}
                    className={`${fieldClass} text-end ${isInvalid ? 'border-expense' : ''}`}
                  />
                  {isInvalid && (
                    <span id={`budget-${category.id}-error`} className="text-sm text-expense">
                      {t('invalidAmount')}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <button type="submit" className={`${primaryButton} min-h-14`}>
          {t('save')}
        </button>
        <p role="status" className="text-center text-income empty:hidden">
          {saved ? t('budgetsSaved') : ''}
        </p>
      </form>
    </main>
  )
}
