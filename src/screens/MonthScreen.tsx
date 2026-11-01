import BudgetAlerts from '../components/BudgetAlerts'
import MonthNavigator from '../components/MonthNavigator'
import QuickAdd from '../components/QuickAdd'
import SummaryCards from '../components/SummaryCards'
import TransactionList from '../components/TransactionList'
import { primaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { budgetProgress } from '../lib/budget'
import { filterByMonth, sortNewestFirst, summarize } from '../lib/summary'
import type { Budget, Category, MonthKey, Settings, Transaction } from '../lib/types'

interface MonthScreenProps {
  month: MonthKey
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  lastCategoryId: Settings['lastCategoryId']
  onMonthChange: (month: MonthKey) => void
  onAdd: () => void
  onQuickAdd: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onOpenInsights: () => void
}

export default function MonthScreen({
  month,
  transactions,
  categories,
  budgets,
  lastCategoryId,
  onMonthChange,
  onAdd,
  onQuickAdd,
  onEdit,
  onDelete,
  onOpenInsights,
}: MonthScreenProps) {
  const { t } = useI18n()
  const monthTransactions = filterByMonth(transactions, month)
  const summary = summarize(monthTransactions)

  return (
    <main className="flex flex-col gap-4 p-4 pb-44">
      <MonthNavigator month={month} onMonthChange={onMonthChange} />
      <SummaryCards summary={summary} />
      <BudgetAlerts
        progress={budgetProgress(monthTransactions, budgets)}
        categories={categories}
        onOpen={onOpenInsights}
      />
      <QuickAdd categories={categories} lastCategoryId={lastCategoryId} onAdd={onQuickAdd} />
      <TransactionList
        transactions={sortNewestFirst(monthTransactions)}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-app via-app px-4 pt-4 pb-3">
        <button type="button" onClick={onAdd} className={`${primaryButton} mx-auto block min-h-14 w-full max-w-md shadow-lg`}>
          {t('addTransaction')}
        </button>
      </div>
    </main>
  )
}
