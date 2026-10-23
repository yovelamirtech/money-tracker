import { formatILS } from '../lib/money'
import { formatShortDate } from '../lib/month'
import type { Category, Transaction } from '../lib/types'

interface TransactionListProps {
  transactions: Transaction[] // already filtered and sorted
  categories: Category[]
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, categories, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-slate-500">אין תנועות בחודש הזה</p>
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]))

  function confirmDelete(transaction: Transaction, categoryName: string) {
    const question = `למחוק את "${categoryName}" בסך ${formatILS(transaction.amountAgorot)}?`
    if (window.confirm(question)) onDelete(transaction.id)
  }

  return (
    <ul aria-label="תנועות" className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
      {transactions.map((t) => {
        const categoryName = categoryNames.get(t.categoryId) ?? 'ללא קטגוריה'
        const isIncome = t.type === 'income'

        return (
          <li key={t.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{categoryName}</div>
              <div className="truncate text-sm text-slate-500">
                {formatShortDate(t.date)}
                {t.note && ` · ${t.note}`}
              </div>
            </div>
            <div
              dir="ltr"
              className={`font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {isIncome ? '+' : '-'}
              {formatILS(t.amountAgorot)}
            </div>
            <button
              type="button"
              aria-label={`מחיקת ${categoryName}`}
              onClick={() => confirmDelete(t, categoryName)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-4 focus-visible:outline-rose-200"
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}
