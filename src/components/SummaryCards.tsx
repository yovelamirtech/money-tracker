import { useI18n } from '../i18n/i18n'
import { formatILS } from '../lib/money'
import { savingsRate, type MonthSummary } from '../lib/summary'

interface SummaryCardsProps {
  summary: MonthSummary
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const { t } = useI18n()
  const balanceColor = summary.balance < 0 ? 'text-expense' : 'text-fg'
  const rate = savingsRate(summary)

  return (
    <section aria-label={t('summaryLabel')} className="grid grid-cols-2 gap-3">
      <SummaryCard label={t('income')} value={formatILS(summary.income)} valueClass="text-income" />
      <SummaryCard label={t('expenses')} value={formatILS(summary.expense)} valueClass="text-expense" />
      <SummaryCard label={t('balance')} value={formatILS(summary.balance)} valueClass={balanceColor} big />
      <SummaryCard
        label={t('savingsRate')}
        value={rate === null ? '—' : `${rate}%`}
        hint={rate === null ? t('noIncome') : t('savingsRateHint')}
        valueClass={rate !== null && rate < 0 ? 'text-expense' : 'text-fg'}
        big
      />
    </section>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  valueClass: string
  hint?: string
  big?: boolean
}

function SummaryCard({ label, value, valueClass, hint, big = false }: SummaryCardProps) {
  return (
    <div role="group" aria-label={label} className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="text-sm text-muted">{label}</div>
      <div dir="ltr" className={`text-end font-bold ${big ? 'text-2xl' : 'text-xl'} ${valueClass}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  )
}
