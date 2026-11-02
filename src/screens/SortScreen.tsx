import { useState } from 'react'
import CategoryIcon from '../components/CategoryIcon'
import ScreenHeader from '../components/ScreenHeader'
import { card, focusRing, primaryButton, secondaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { uncategorizedQueue } from '../lib/entry'
import { formatILS } from '../lib/money'
import { formatFullDate } from '../lib/month'
import type { Category, NoteRule, Transaction } from '../lib/types'

export interface AssignResult {
  /** The transactions that changed, as they were before (for undo). */
  before: Transaction[]
  rulesBefore: NoteRule[]
}

interface SortScreenProps {
  transactions: Transaction[]
  categories: Category[]
  onAssign: (transactionId: string, categoryId: string) => AssignResult
  onUndo: (result: AssignResult) => void
  onBack: () => void
}

interface LastAction {
  result: AssignResult
  message: string
}

/** One uncategorized entry at a time, with a button per category. A tap sorts it and shows the next one. */
export default function SortScreen({ transactions, categories, onAssign, onUndo, onBack }: SortScreenProps) {
  const { t, categoryName } = useI18n()
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())
  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  const all = uncategorizedQueue(transactions)
  const queue = all.filter((tx) => !skipped.has(tx.id))
  const current = queue.at(0)

  function assign(tx: Transaction, category: Category) {
    const result = onAssign(tx.id, category.id)
    const note = tx.note ?? t('sortNoNote')
    const name = categoryName(category)
    const more = result.before.length - 1
    setLastAction({
      result,
      message: more > 0 ? t('sortAssignedMore', { note, name, count: more }) : t('sortAssigned', { note, name }),
    })
  }

  function undo() {
    if (!lastAction) return
    onUndo(lastAction.result)
    setLastAction(null)
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  function categoryButtons(list: Category[], tx: Transaction) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => assign(tx, c)}
            className={`flex min-h-14 items-center gap-2 rounded-2xl bg-card px-3 text-start font-semibold shadow-sm ring-1 ring-line hover:bg-subtle ${focusRing}`}
          >
            <CategoryIcon category={c} />
            <span className="min-w-0 truncate">{categoryName(c)}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('sortTitle')} onBack={onBack} />

      <div role="status" className="flex min-h-11 items-center justify-between gap-2 text-sm empty:hidden">
        {lastAction && (
          <>
            <span className="min-w-0 text-muted">{lastAction.message}</span>
            <button type="button" onClick={undo} className={`shrink-0 rounded-xl px-3 py-2 font-semibold text-accent-text ${focusRing}`}>
              {t('undo')}
            </button>
          </>
        )}
      </div>

      {current ? (
        <>
          <section aria-label={t('sortProgress', { count: queue.length })} className={`${card} flex flex-col gap-1 text-center`}>
            <p className="text-sm text-muted">{t('sortProgress', { count: queue.length })}</p>
            <p className="text-2xl font-bold break-words">{current.note ?? t('sortNoNote')}</p>
            <p dir="ltr" className="text-xl font-semibold text-fg">
              {formatILS(current.amountAgorot)}
            </p>
            <p className="text-sm text-muted">{formatFullDate(current.date)}</p>
          </section>

          <section aria-labelledby="sort-expense-title" className="flex flex-col gap-2">
            <h2 id="sort-expense-title" className="sr-only">
              {t('sortExpenseCategories')}
            </h2>
            {categoryButtons(expenseCategories, current)}
          </section>

          {/* Income is optional in this app, so its categories stay folded away until asked for. */}
          <details>
            <summary className={`cursor-pointer self-start rounded-xl py-2 text-sm font-semibold text-muted ${focusRing}`}>
              {t('sortIncomeCategories')}
            </summary>
            <section aria-label={t('sortIncomeCategories')} className="mt-2">
              {categoryButtons(incomeCategories, current)}
            </section>
          </details>

          <button
            type="button"
            onClick={() => setSkipped(new Set([...skipped, current.id]))}
            className={`${secondaryButton} self-center px-8`}
          >
            {t('sortSkip')}
          </button>
        </>
      ) : (
        <section className={`${card} flex flex-col items-center gap-3 text-center`}>
          <p className="text-lg font-bold">
            {all.length > 0 ? t('sortDoneSkipped', { count: all.length }) : (
              <>
                <span aria-hidden="true">✓ </span>
                {t('sortDone')}
              </>
            )}
          </p>
          {all.length > 0 && (
            <button type="button" onClick={() => setSkipped(new Set())} className={`${secondaryButton} w-full`}>
              {t('sortStartOver')}
            </button>
          )}
          <button type="button" onClick={onBack} className={`${primaryButton} w-full`}>
            {t('sortBackToEntry')}
          </button>
        </section>
      )}
    </main>
  )
}
