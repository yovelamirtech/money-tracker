import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import type { CategoryValues } from './components/CategoryForm'
import { useTheme } from './hooks/useTheme'
import { createI18n, I18nContext } from './i18n/i18n'
import { addCategory, deleteCategory, updateCategory } from './lib/categories'
import { createId } from './lib/id'
import { todayISO, toMonthKey } from './lib/month'
import { applyRecurring, createRuleFromTransaction, deleteRule, pauseRule, resumeRule } from './lib/recurring'
import { loadData, saveData } from './lib/storage'
import type { AppData, Budget, MonthKey, Settings, Transaction, TransactionType } from './lib/types'
import BudgetsScreen from './screens/BudgetsScreen'
import CategoriesScreen from './screens/CategoriesScreen'
import InsightsScreen from './screens/InsightsScreen'
import MonthScreen from './screens/MonthScreen'
import RecurringScreen from './screens/RecurringScreen'
import SearchScreen from './screens/SearchScreen'
import SettingsScreen, { type ManageView } from './screens/SettingsScreen'
import TransactionFormScreen, { type SaveOptions } from './screens/TransactionFormScreen'

// Simple view state instead of a router. Sub-screens remember which tab to go back to.
type View = { name: Tab } | { name: 'form'; editId?: string; back: Tab } | { name: ManageView; back: Tab }

function currentMonth(): MonthKey {
  return toMonthKey(todayISO())
}

/** Creates this month's recurring transactions (if not created yet). */
function withRecurring(data: AppData): AppData {
  return applyRecurring(data, currentMonth(), new Date().toISOString(), createId)
}

function rememberCategory(data: AppData, type: TransactionType, categoryId: string): AppData {
  return {
    ...data,
    settings: { ...data.settings, lastCategoryId: { ...data.settings.lastCategoryId, [type]: categoryId } },
  }
}

export default function App() {
  const [data, setData] = useState<AppData>(() => withRecurring(loadData()))
  const [view, setView] = useState<View>({ name: 'month' })
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(currentMonth)
  const i18n = useMemo(() => createI18n(data.settings.language), [data.settings.language])

  useEffect(() => saveData(data), [data])
  useTheme(data.settings.theme)

  useEffect(() => {
    const html = document.documentElement
    html.lang = i18n.lang
    html.dir = i18n.dir
    document.title = i18n.t('appTitle')
  }, [i18n])

  // The app may stay open (or in the background) into a new month.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === 'visible') setData((d) => withRecurring(d))
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  // Move focus to the new screen's heading, so keyboard and screen reader users start at the top.
  const isFirstView = useRef(true)
  useEffect(() => {
    if (isFirstView.current) {
      isFirstView.current = false
      return
    }
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [view])

  const tab: Tab = view.name === 'form' || 'back' in view ? view.back : view.name

  function handleSaveTransaction(transaction: Transaction, { repeatMonthly }: SaveOptions) {
    const isEdit = data.transactions.some((t) => t.id === transaction.id)
    let next: AppData
    if (isEdit) {
      next = { ...data, transactions: data.transactions.map((t) => (t.id === transaction.id ? transaction : t)) }
    } else if (repeatMonthly) {
      const rule = createRuleFromTransaction(transaction, createId())
      next = withRecurring({
        ...data,
        transactions: [...data.transactions, { ...transaction, recurringId: rule.id }],
        recurring: [...data.recurring, rule],
      })
    } else {
      next = { ...data, transactions: [...data.transactions, transaction] }
    }
    setData(rememberCategory(next, transaction.type, transaction.categoryId))

    const back = view.name === 'form' ? view.back : 'month'
    if (back === 'month') setSelectedMonth(toMonthKey(transaction.date))
    setView({ name: back })
  }

  function handleQuickAdd(transaction: Transaction) {
    setData(rememberCategory({ ...data, transactions: [...data.transactions, transaction] }, transaction.type, transaction.categoryId))
    setSelectedMonth(toMonthKey(transaction.date))
  }

  function handleDelete(id: string) {
    setData({ ...data, transactions: data.transactions.filter((t) => t.id !== id) })
  }

  function handleSettingsChange(changes: Partial<Settings>) {
    setData({ ...data, settings: { ...data.settings, ...changes } })
  }

  function handleToggleRule(id: string) {
    const recurring = data.recurring.map((r) => {
      if (r.id !== id) return r
      return r.active ? pauseRule(r) : resumeRule(r, currentMonth())
    })
    setData(withRecurring({ ...data, recurring }))
  }

  function handleAddCategory(type: TransactionType, values: CategoryValues) {
    setData(addCategory(data, { id: createId(), type, ...values }))
  }

  function handleUpdateCategory(id: string, values: CategoryValues) {
    setData(updateCategory(data, id, values))
  }

  function edit(transaction: Transaction) {
    setView({ name: 'form', editId: transaction.id, back: tab })
  }

  function renderView() {
    switch (view.name) {
      case 'month':
        return (
          <MonthScreen
            month={selectedMonth}
            transactions={data.transactions}
            categories={data.categories}
            budgets={data.budgets}
            lastCategoryId={data.settings.lastCategoryId}
            onMonthChange={setSelectedMonth}
            onAdd={() => setView({ name: 'form', back: 'month' })}
            onQuickAdd={handleQuickAdd}
            onEdit={edit}
            onDelete={handleDelete}
            onOpenInsights={() => setView({ name: 'insights' })}
          />
        )
      case 'form': {
        const initial = data.transactions.find((t) => t.id === view.editId)
        return (
          <TransactionFormScreen
            categories={data.categories}
            initial={initial}
            lastCategoryId={data.settings.lastCategoryId}
            onSave={handleSaveTransaction}
            onCancel={() => setView({ name: view.back })}
          />
        )
      }
      case 'insights':
        return (
          <InsightsScreen
            month={selectedMonth}
            transactions={data.transactions}
            categories={data.categories}
            budgets={data.budgets}
            onMonthChange={setSelectedMonth}
            onEditBudgets={() => setView({ name: 'budgets', back: 'insights' })}
          />
        )
      case 'search':
        return (
          <SearchScreen transactions={data.transactions} categories={data.categories} onEdit={edit} onDelete={handleDelete} />
        )
      case 'settings':
        return (
          <SettingsScreen
            data={data}
            onSettingsChange={handleSettingsChange}
            onOpen={(name) => setView({ name, back: 'settings' })}
            onImport={(imported) => setData(withRecurring(imported))}
          />
        )
      case 'categories':
        return (
          <CategoriesScreen
            categories={data.categories}
            transactions={data.transactions}
            onAdd={handleAddCategory}
            onUpdate={handleUpdateCategory}
            onDelete={(id) => setData(deleteCategory(data, id))}
            onBack={() => setView({ name: view.back })}
          />
        )
      case 'recurring':
        return (
          <RecurringScreen
            rules={data.recurring}
            categories={data.categories}
            onToggle={handleToggleRule}
            onDelete={(id) => setData(deleteRule(data, id))}
            onBack={() => setView({ name: view.back })}
          />
        )
      case 'budgets':
        return (
          <BudgetsScreen
            budgets={data.budgets}
            categories={data.categories}
            onSave={(budgets: Budget[]) => setData({ ...data, budgets })}
            onBack={() => setView({ name: view.back })}
          />
        )
    }
  }

  return (
    <I18nContext.Provider value={i18n}>
      <div className="min-h-dvh bg-app text-fg">
        <div className="mx-auto max-w-md">{renderView()}</div>
        {view.name !== 'form' && <BottomNav current={tab} onChange={(name) => setView({ name })} />}
      </div>
    </I18nContext.Provider>
  )
}
