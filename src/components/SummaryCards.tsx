import { formatILS } from '../lib/money'
import type { MonthSummary } from '../lib/summary'

interface SummaryCardsProps {
  summary: MonthSummary
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const balanceColor = summary.balance < 0 ? 'text-rose-600' : 'text-slate-900'

  return (
    <section aria-label="סיכום חודשי" className="grid grid-cols-2 gap-3">
      <SummaryCard label="הכנסות" agorot={summary.income} valueClass="text-emerald-600" />
      <SummaryCard label="הוצאות" agorot={summary.expense} valueClass="text-rose-600" />
      <SummaryCard
        label="יתרה"
        agorot={summary.balance}
        valueClass={`text-2xl ${balanceColor}`}
        wide
      />
    </section>
  )
}

interface SummaryCardProps {
  label: string
  agorot: number
  valueClass: string
  wide?: boolean
}

function SummaryCard({ label, agorot, valueClass, wide = false }: SummaryCardProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`rounded-2xl bg-white p-4 shadow-sm ${wide ? 'col-span-2' : ''}`}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div dir="ltr" className={`text-end text-xl font-bold ${valueClass}`}>
        {formatILS(agorot)}
      </div>
    </div>
  )
}
