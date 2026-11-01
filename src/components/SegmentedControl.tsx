import { focusRing } from './ui'

interface SegmentedControlProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'md' | 'sm'
}

/** A row of toggle buttons where exactly one is pressed. */
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-subtle p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-xl font-semibold ${size === 'md' ? 'min-h-12 text-lg' : 'min-h-11 text-base'} ${
              selected ? 'bg-card text-fg shadow-sm' : 'text-muted hover:text-fg'
            } ${focusRing}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
