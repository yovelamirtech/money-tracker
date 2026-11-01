import { useId, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { validateCategoryName } from '../lib/categories'
import { CATEGORY_COLOR_NAMES, CATEGORY_COLORS, type CategoryColor } from '../lib/colors'
import type { Category, TransactionType } from '../lib/types'
import { fieldClass, primaryButton, secondaryButton } from './ui'

export interface CategoryValues {
  name: string
  icon?: string
  color: CategoryColor
}

interface CategoryFormProps {
  categories: Category[]
  type: TransactionType
  initial?: Category
  initialName?: string // display name (may be translated)
  submitLabel: string
  onSubmit: (values: CategoryValues) => void
  onCancel?: () => void
}

const colorLabels: Record<CategoryColor, MessageKey> = {
  blue: 'colorBlue',
  orange: 'colorOrange',
  aqua: 'colorAqua',
  yellow: 'colorYellow',
  magenta: 'colorMagenta',
  green: 'colorGreen',
  violet: 'colorViolet',
  red: 'colorRed',
  gray: 'colorGray',
}

/** Name, optional emoji and color. Used both to add and to edit a category. */
export default function CategoryForm({
  categories,
  type,
  initial,
  initialName,
  submitLabel,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(initialName ?? initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? 'blue')
  const [error, setError] = useState<MessageKey | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = validateCategoryName(categories, name, type, initial?.id)
    if (problem) {
      setError(problem === 'empty' ? 'nameEmpty' : 'nameDuplicate')
      return
    }
    onSubmit({ name: name.trim(), icon: icon.trim() || undefined, color })
    if (!initial) {
      setName('')
      setIcon('')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('categoryName')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${fieldClass} ${error ? 'border-expense' : ''}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('categoryIcon')}</span>
          <input type="text" value={icon} maxLength={8} onChange={(e) => setIcon(e.target.value)} className={`${fieldClass} text-center`} />
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-expense">
          {t(error)}
        </p>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t('categoryColor')}</legend>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_COLOR_NAMES.map((c) => (
            <label key={c} className="cursor-pointer" title={t(colorLabels[c])}>
              <input
                type="radio"
                name={`${id}-color`}
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                aria-label={t(colorLabels[c])}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="block size-11 rounded-full border-4 border-card ring-2 ring-transparent peer-checked:ring-fg peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
                style={{ backgroundColor: CATEGORY_COLORS[c] }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={`${primaryButton} flex-1`}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={`${secondaryButton} flex-1`}>
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
