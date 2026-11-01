import { useI18n } from '../i18n/i18n'
import { addMonths, formatMonthLabel } from '../lib/month'
import type { MonthKey } from '../lib/types'
import { iconButton } from './ui'

interface MonthNavigatorProps {
  month: MonthKey
  onMonthChange: (month: MonthKey) => void
}

// The previous month sits on the start side: right (→) in RTL, left (←) in LTR.
export default function MonthNavigator({ month, onMonthChange }: MonthNavigatorProps) {
  const { t, locale, dir } = useI18n()
  const arrowClass = `${iconButton} size-12 text-2xl`

  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        aria-label={t('prevMonth')}
        className={arrowClass}
        onClick={() => onMonthChange(addMonths(month, -1))}
      >
        {dir === 'rtl' ? '→' : '←'}
      </button>
      <h1 tabIndex={-1} className="text-xl font-bold outline-none">
        {formatMonthLabel(month, locale)}
      </h1>
      <button
        type="button"
        aria-label={t('nextMonth')}
        className={arrowClass}
        onClick={() => onMonthChange(addMonths(month, 1))}
      >
        {dir === 'rtl' ? '←' : '→'}
      </button>
    </header>
  )
}
