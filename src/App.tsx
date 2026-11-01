import { useEffect, useMemo, useRef, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import type { CategoryValues } from './components/CategoryForm'
import { UNCATEGORIZED_ID } from './data/defaultCategories'
import { useTheme } from './hooks/useTheme'
import { createI18n, I18nContext } from './i18n/i18n'
import { addCategory, deleteCategory, updateCategory } from './lib/categories'
import { createId } from './lib/id'
import { todayISO, toMonthKey } from './lib/month'
import { assignCategory, createEntry, learnRule, restoreTransactions } from './lib/entry'
import { applyRecurring, createRuleFromTransaction, deleteRule, pauseRule, resumeRule } from './lib/recurring'
import { loadData, saveData } from './lib/storage'
import type { AppData, Budget, MonthKey, Settings, Transaction, TransactionType } from './lib/types'
import BudgetsScreen from './screens/BudgetsScreen'
import CategoriesScreen from './screens/CategoriesScreen'
import EntryScreen from './screens/EntryScreen'
import MonthScreen from './screens/MonthScreen'
import RecurringScreen from './screens/RecurringScreen'
import SearchScreen from './screens/SearchScreen'
import SettingsScreen, { type ManageView } from './screens/SettingsScreen'
import SortScreen, { type AssignResult } from './screens/SortScreen'
import TransactionFormScreen, { type SaveOptions } from './screens/TransactionFormScreen'

// Simple view state instead of a router. Sub-screens remember which tab to go back to.
type View =
  | { name: Tab }
  | { name: 'form'; editId?: string; back: Tab }
  | { name: ManageView; back: Tab }
  | { name: 'sort'; back: Tab }

function currentMonth(): MonthKey {
  return toMonthKey(todayISO())
}

/** Creates this month's recurring transactions (if not created yet). */
function withRecurring(data: AppData): AppData {
  return applyRecurring(data, currentMonth(), new Date().toISOString(), createId)
}

function rememberCategory(data: AppData, type: TransactionType, categoryId: string): AppData {
  if (categoryId === UNCATEGORIZED_ID) return data
  return {
    ...data,
    settings: { ...data.settings, lastCategoryId: { ...data.settings.lastCategoryId, [type]: categoryId } },
  }
}

/**
 * Keeps the entry bar on top of the on-screen keyboard: the keyboard covers part of the page without
 * resizing it (iOS, and Android Chrome by default), so the covered height is exposed as --kb, and
 * `kb-open` is set on <html> while it's open (the tab bar hides then).
 */
function useKeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      document.documentElement.style.setProperty('--kb', `${covered}px`)
      document.documentElement.classList.toggle('kb-open', covered > 80)
    }
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    update()
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])
}

export default function App() {
  const [data, setData] = useState<AppData>(() => withRecurring(loadData()))
  const [view, setView] = useState<View>({ name: 'entry' })
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(currentMonth)
  const i18n = useMemo(() => createI18n(data.settings.language), [data.settings.language])

  useEffect(() => saveData(data), [data])
  useTheme(data.settings.theme)
  useKeyboardInset()

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
  // Opening the entry tab goes straight into the entry field instead, ready to type; coming back to it
  // from an edit or from sorting doesn't, so the keyboard doesn't cover the list that was just fixed.
  const previousView = useRef<View | null>(null)
  useEffect(() => {
    const previous = previousView.current
    previousView.current = view
    if (!previous) return
    const cameBack = previous.name === 'form' || previous.name === 'sort'
    const field = view.name === 'entry' && !cameBack ? document.querySelector<HTMLElement>('main [data-autofocus]') : null
    // On the entry screen the list is scrolled to the newest entries at the bottom; keep it there.
    ;(field ?? document.querySelector<HTMLElement>('main h1'))?.focus({ preventScroll: view.name === 'entry' })
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
    // Choosing a category for a note in the form teaches it too, like the sort screen.
    next = { ...next, noteRules: learnRule(next.noteRules, transaction.note, transaction.categoryId) }
    setData(rememberCategory(next, transaction.type, transaction.categoryId))

    const back = view.name === 'form' ? view.back : 'entry'
    if (back === 'month') setSelectedMonth(toMonthKey(transaction.date))
    setView({ name: back })
  }

  function handleEntry(entry: { amountAgorot: number; note: string }): Transaction {
    const transaction = createEntry(entry, data, createId(), todayISO(), new Date().toISOString())
    setData({ ...data, transactions: [...data.transactions, transaction] })
    return transaction
  }

  function handleAssign(transactionId: string, categoryId: string): AssignResult {
    const { data: next, before } = assignCategory(data, transactionId, categoryId)
    setData(next)
    return { before, rulesBefore: data.noteRules }
  }

  function handleUndoAssign({ before, rulesBefore }: AssignResult) {
    setData(restoreTransactions(data, before, rulesBefore))
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
      case 'entry':
        return (
          <EntryScreen
            transactions={data.transactions}
            categories={data.categories}
            noteRules={data.noteRules}
            onAdd={handleEntry}
            onEdit={edit}
            onDelete={handleDelete}
            onSort={() => setView({ name: 'sort', back: 'entry' })}
            onDetailedAdd={() => setView({ name: 'form', back: 'entry' })}
          />
        )
      case 'sort':
        return (
          <SortScreen
            transactions={data.transactions}
            categories={data.categories}
            onAssign={handleAssign}
            onUndo={handleUndoAssign}
            onBack={() => setView({ name: view.back })}
          />
        )
      case 'month':
        return (
          <MonthScreen
            month={selectedMonth}
            transactions={data.transactions}
            categories={data.categories}
            budgets={data.budgets}
            onMonthChange={setSelectedMonth}
            onEdit={edit}
            onDelete={handleDelete}
            onEditBudgets={() => setView({ name: 'budgets', back: 'month' })}
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
