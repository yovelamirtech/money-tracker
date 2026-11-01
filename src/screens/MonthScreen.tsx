import { useState } from 'react'
import BudgetAlerts from '../components/BudgetAlerts'
import BudgetProgressList from '../components/BudgetProgressList'
import CategoryChart from '../components/CategoryChart'
import MonthComparison from '../components/MonthComparison'
import MonthNavigator from '../components/MonthNavigator'
import SegmentedControl from '../components/SegmentedControl'
import SummaryCards from '../components/SummaryCards'
import TransactionList from '../components/TransactionList'
import TrendChart from '../components/TrendChart'
import { card, sectionTitle, secondaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { budgetProgress } from '../lib/budget'
import { addMonths, lastMonths } from '../lib/month'
import { compareExpensesByCategory, filterByMonth, groupByCategory, monthlyTotals, sortNewestFirst, summarize } from '../lib/summary'
import type { Budget, Category, MonthKey, Transaction } from '../lib/types'

interface MonthScreenProps {
  month: MonthKey
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  onMonthChange: (month: MonthKey) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onEditBudgets: () => void
}

type TrendRange = '6' | '12'

/** The monthly check: totals, budgets, where the money went, changes, the trend, and every transaction. */
export default function MonthScreen({
  month,
  transactions,
  categories,
  budgets,
  onMonthChange,
  onEdit,
  onDelete,
  onEditBudgets,
}: MonthScreenProps) {
  const { t } = useI18n()
  const [range, setRange] = useState<TrendRange>('6')

  const current = filterByMonth(transactions, month)
  const previous = filterByMonth(transactions, addMonths(month, -1))
  const progress = budgetProgress(current, budgets)
  const expenseTotals = groupByCategory(current.filter((tx) => tx.type === 'expense'))

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <MonthNavigator month={month} onMonthChange={onMonthChange} />
      <SummaryCards summary={summarize(current)} />
      <BudgetAlerts
        progress={progress}
        categories={categories}
        onOpen={() => document.getElementById('budgets-title')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <section aria-labelledby="by-category-title" className={card}>
        <h2 id="by-category-title" className={sectionTitle}>
          {t('spendingByCategory')}
        </h2>
        <CategoryChart totals={expenseTotals} categories={categories} />
      </section>

      <section aria-labelledby="budgets-title" className={card}>
        <h2 id="budgets-title" className={sectionTitle}>
          {t('budgetsTitle')}
        </h2>
        {budgets.length === 0 ? (
          <p className="mb-3 text-muted">{t('noBudgets')}</p>
        ) : (
          <div className="mb-4">
            <BudgetProgressList progress={progress} categories={categories} />
          </div>
        )}
        <button type="button" onClick={onEditBudgets} className={`${secondaryButton} w-full`}>
          {t('setBudgets')}
        </button>
      </section>

      <section aria-labelledby="comparison-title" className={card}>
        <h2 id="comparison-title" className={sectionTitle}>
          {t('comparisonTitle')}
        </h2>
        <MonthComparison changes={compareExpensesByCategory(current, previous)} categories={categories} />
      </section>

      <section aria-labelledby="trend-title" className={card}>
        <h2 id="trend-title" className={sectionTitle}>
          {t('trendTitle')}
        </h2>
        <div className="mb-3">
          <SegmentedControl
            label={t('trendRange')}
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: t('months6') },
              { value: '12', label: t('months12') },
            ]}
          />
        </div>
        <TrendChart key={`${month}-${range}`} totals={monthlyTotals(transactions, lastMonths(month, Number(range)))} />
      </section>

      <section aria-labelledby="month-transactions-title" className="flex flex-col gap-2">
        <h2 id="month-transactions-title" className="text-lg font-bold">
          {t('transactionsLabel')}
        </h2>
        <TransactionList transactions={sortNewestFirst(current)} categories={categories} onEdit={onEdit} onDelete={onDelete} />
      </section>
    </main>
  )
}
