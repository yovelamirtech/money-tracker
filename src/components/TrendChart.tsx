import { useState } from 'react'
import { useI18n } from '../i18n/i18n'
import { niceTicks } from '../lib/chart'
import { formatCompactILS, formatILS } from '../lib/money'
import { formatMonthLabel, formatShortMonth } from '../lib/month'
import type { MonthTotals } from '../lib/summary'

interface TrendChartProps {
  totals: MonthTotals[] // oldest first
}

const WIDTH = 340
const HEIGHT = 180
const AXIS_WIDTH = 44 // room for the y labels
const TOP = 8
const BOTTOM = 22 // room for the month labels
const BAR_GAP = 2

/**
 * Income vs expenses per month as paired columns. Time runs left to right in both languages.
 * Tapping or focusing a month shows its numbers in the readout above the chart.
 */
export default function TrendChart({ totals }: TrendChartProps) {
  const { t, locale } = useI18n()
  const [selected, setSelected] = useState(totals.length - 1)
  const active = totals[Math.min(selected, totals.length - 1)]

  const max = Math.max(0, ...totals.flatMap((m) => [m.income, m.expense]))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const plotHeight = HEIGHT - TOP - BOTTOM
  const slot = (WIDTH - AXIS_WIDTH) / totals.length
  const barWidth = Math.min(24, (slot - 6 - BAR_GAP) / 2)
  const y = (value: number) => TOP + plotHeight - (value / top) * plotHeight

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <LegendItem colorClass="bg-chart-income" label={t('income')} />
        <LegendItem colorClass="bg-chart-expense" label={t('expenses')} />
      </div>

      <p aria-live="polite" className="mb-1 min-h-10 text-sm">
        <span className="font-semibold">{formatMonthLabel(active.month, locale)}</span>
        <br />
        <span className="text-muted">
          {t('income')} <span dir="ltr">{formatILS(active.income)}</span> · {t('expenses')}{' '}
          <span dir="ltr">{formatILS(active.expense)}</span>
        </span>
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={t('trendTitle')}
        direction="ltr"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={AXIS_WIDTH} x2={WIDTH} y1={y(tick)} y2={y(tick)} className="stroke-chart-grid" strokeWidth={1} />
            <text x={AXIS_WIDTH - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] tabular-nums">
              {formatCompactILS(tick)}
            </text>
          </g>
        ))}
        <line x1={AXIS_WIDTH} x2={WIDTH} y1={y(0)} y2={y(0)} className="stroke-chart-axis" strokeWidth={1} />

        {totals.map((m, i) => {
          const center = AXIS_WIDTH + slot * i + slot / 2
          const isActive = m === active
          return (
            <g key={m.month}>
              {isActive && (
                <rect x={center - slot / 2 + 1} y={TOP} width={slot - 2} height={plotHeight} rx={4} className="fill-subtle" />
              )}
              <Column x={center - BAR_GAP / 2 - barWidth} width={barWidth} top={y(m.income)} bottom={y(0)} className="fill-chart-income" />
              <Column x={center + BAR_GAP / 2} width={barWidth} top={y(m.expense)} bottom={y(0)} className="fill-chart-expense" />
              <text x={center} y={HEIGHT - 6} textAnchor="middle" className={`text-[10px] ${isActive ? 'fill-fg font-bold' : 'fill-muted'}`}>
                {formatShortMonth(m.month, locale)}
              </text>
              {/* Hit target: the whole month slot, bigger than the bars */}
              <rect
                x={center - slot / 2}
                y={0}
                width={slot}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setSelected(i)}
                onClick={() => setSelected(i)}
              />
            </g>
          )
        })}
      </svg>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-accent-text">{t('showAsTable')}</summary>
        <table className="mt-2 w-full">
          <thead className="text-muted">
            <tr>
              <th className="py-1 text-start font-medium">{t('month')}</th>
              <th className="py-1 text-end font-medium">{t('income')}</th>
              <th className="py-1 text-end font-medium">{t('expenses')}</th>
              <th className="py-1 text-end font-medium">{t('balance')}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {totals.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="py-1">{formatMonthLabel(m.month, locale)}</td>
                <td dir="ltr" className="py-1 text-start rtl:text-end">{formatILS(m.income)}</td>
                <td dir="ltr" className="py-1 text-start rtl:text-end">{formatILS(m.expense)}</td>
                <td dir="ltr" className="py-1 text-start rtl:text-end">{formatILS(m.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`inline-block size-3 rounded-sm ${colorClass}`} />
      {label}
    </span>
  )
}

/** A column with a 4px rounded top and a square base. */
function Column({ x, width, top, bottom, className }: { x: number; width: number; top: number; bottom: number; className: string }) {
  const height = bottom - top
  if (height <= 0) return null
  const r = Math.min(4, width / 2, height)
  const path = `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`
  return <path d={path} className={className} />
}
