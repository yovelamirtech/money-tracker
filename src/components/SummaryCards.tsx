import { useI18n } from '../i18n/i18n'
import { formatILS } from '../lib/money'
import type { MonthSummary } from '../lib/summary'

interface SummaryCardsProps {
  summary: MonthSummary
}

/**
 * The month's spending, front and center. Income is optional: the income and "left" cards show up
 * only in a month where some income was entered. Nothing is shown in red, even when spending is
 * more than income.
 */
export default function SummaryCards({ summary }: SummaryCardsProps) {
  const { t } = useI18n()
  const hasIncome = summary.income > 0

  return (
    <section aria-label={t('summaryLabel')} className="grid grid-cols-2 gap-3">
      <SummaryCard label={t('expenses')} value={formatILS(summary.expense)} big wide />
      {hasIncome && (
        <>
          <SummaryCard label={t('income')} value={formatILS(summary.income)} />
          <SummaryCard
            label={t(summary.balance >= 0 ? 'balance' : 'overIncome')}
            value={formatILS(Math.abs(summary.balance))}
          />
        </>
      )}
    </section>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  big?: boolean
  wide?: boolean
}

function SummaryCard({ label, value, big = false, wide = false }: SummaryCardProps) {
  return (
    <div role="group" aria-label={label} className={`rounded-2xl bg-card p-4 shadow-sm ${wide ? 'col-span-2' : ''}`}>
      <div className="text-sm text-muted">{label}</div>
      <div dir="ltr" className={`text-end font-bold text-fg ${big ? 'text-3xl' : 'text-xl'}`}>
        {value}
      </div>
    </div>
  )
}
