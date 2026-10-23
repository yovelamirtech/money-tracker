import { useState } from 'react'
import { defaultCategories } from './data/defaultCategories'
import { todayISO, toMonthKey } from './lib/month'
import { loadTransactions, saveTransactions } from './lib/storage'
import type { MonthKey, Transaction } from './lib/types'
import AddTransactionScreen from './screens/AddTransactionScreen'
import MonthScreen from './screens/MonthScreen'

type Screen = 'month' | 'add'

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
  const [screen, setScreen] = useState<Screen>('month')
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(() => toMonthKey(todayISO()))

  function updateTransactions(next: Transaction[]) {
    setTransactions(next)
    saveTransactions(next)
  }

  function handleSave(transaction: Transaction) {
    updateTransactions([...transactions, transaction])
    setSelectedMonth(toMonthKey(transaction.date))
    setScreen('month')
  }

  function handleDelete(id: string) {
    updateTransactions(transactions.filter((t) => t.id !== id))
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-md">
        {screen === 'month' ? (
          <MonthScreen
            month={selectedMonth}
            transactions={transactions}
            categories={defaultCategories}
            onMonthChange={setSelectedMonth}
            onAdd={() => setScreen('add')}
            onDelete={handleDelete}
          />
        ) : (
          <AddTransactionScreen
            categories={defaultCategories}
            onSave={handleSave}
            onCancel={() => setScreen('month')}
          />
        )}
      </div>
    </div>
  )
}
