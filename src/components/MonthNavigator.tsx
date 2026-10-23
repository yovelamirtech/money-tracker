import { addMonths, formatMonthLabel } from '../lib/month'
import type { MonthKey } from '../lib/types'

interface MonthNavigatorProps {
  month: MonthKey
  onMonthChange: (month: MonthKey) => void
}

const arrowButtonClass =
  'flex size-12 items-center justify-center rounded-full text-2xl text-slate-600 hover:bg-slate-200 focus-visible:outline-4 focus-visible:outline-indigo-300'

// In RTL the previous month sits on the right (→) and the next month on the left (←).
export default function MonthNavigator({ month, onMonthChange }: MonthNavigatorProps) {
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        aria-label="החודש הקודם"
        className={arrowButtonClass}
        onClick={() => onMonthChange(addMonths(month, -1))}
      >
        →
      </button>
      <h1 className="text-xl font-bold">{formatMonthLabel(month)}</h1>
      <button
        type="button"
        aria-label="החודש הבא"
        className={arrowButtonClass}
        onClick={() => onMonthChange(addMonths(month, 1))}
      >
        ←
      </button>
    </header>
  )
}
