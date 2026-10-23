import MonthNavigator from '../components/MonthNavigator'
import SummaryCards from '../components/SummaryCards'
import TransactionList from '../components/TransactionList'
import { filterByMonth, sortNewestFirst, summarize } from '../lib/summary'
import type { Category, MonthKey, Transaction } from '../lib/types'

interface MonthScreenProps {
  month: MonthKey
  transactions: Transaction[]
  categories: Category[]
  onMonthChange: (month: MonthKey) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

export default function MonthScreen({
  month,
  transactions,
  categories,
  onMonthChange,
  onAdd,
  onDelete,
}: MonthScreenProps) {
  const monthTransactions = filterByMonth(transactions, month)
  const summary = summarize(monthTransactions)

  return (
    <main className="flex flex-col gap-4 p-4 pb-28">
      <MonthNavigator month={month} onMonthChange={onMonthChange} />
      <SummaryCards summary={summary} />
      <TransactionList
        transactions={sortNewestFirst(monthTransactions)}
        categories={categories}
        onDelete={onDelete}
      />

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-slate-100 via-slate-100 p-4">
        <button
          type="button"
          onClick={onAdd}
          className="mx-auto block min-h-14 w-full max-w-md rounded-2xl bg-indigo-600 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          + הוספת תנועה
        </button>
      </div>
    </main>
  )
}
