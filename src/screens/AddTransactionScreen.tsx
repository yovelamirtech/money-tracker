import { useState, type FormEvent } from 'react'
import { createId } from '../lib/id'
import { parseAmount } from '../lib/money'
import { todayISO } from '../lib/month'
import type { Category, Transaction, TransactionType } from '../lib/types'

interface AddTransactionScreenProps {
  categories: Category[]
  onSave: (transaction: Transaction) => void
  onCancel: () => void
}

const typeOptions: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'הוצאה' },
  { type: 'income', label: 'הכנסה' },
]

const fieldClass =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200'

function firstCategoryId(categories: Category[], type: TransactionType): string {
  return categories.find((c) => c.type === type)?.id ?? ''
}

export default function AddTransactionScreen({ categories, onSave, onCancel }: AddTransactionScreenProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amountInput, setAmountInput] = useState('')
  const [categoryId, setCategoryId] = useState(() => firstCategoryId(categories, 'expense'))
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')
  const [amountError, setAmountError] = useState(false)

  const categoriesOfType = categories.filter((c) => c.type === type)

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    setCategoryId(firstCategoryId(categories, nextType))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountAgorot = parseAmount(amountInput)
    if (amountAgorot === null) {
      setAmountError(true)
      return
    }

    const trimmedNote = note.trim()
    onSave({
      id: createId(),
      type,
      amountAgorot,
      categoryId,
      date: date || todayISO(), // the date field can be cleared on some browsers
      ...(trimmedNote && { note: trimmedNote }),
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-xl font-bold">תנועה חדשה</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div role="group" aria-label="סוג תנועה" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-1">
          {typeOptions.map((option) => {
            const selected = option.type === type
            const selectedColor = option.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
            return (
              <button
                key={option.type}
                type="button"
                aria-pressed={selected}
                onClick={() => handleTypeChange(option.type)}
                className={`min-h-12 rounded-xl text-lg font-semibold ${
                  selected ? `bg-white shadow-sm ${selectedColor}` : 'text-slate-600'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-medium">סכום (₪)</span>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value)
              setAmountError(false)
            }}
            aria-invalid={amountError}
            aria-describedby={amountError ? 'amount-error' : undefined}
            className={`${fieldClass} text-end ${amountError ? 'border-rose-500' : ''}`}
            placeholder="0.00"
          />
          {amountError && (
            <span id="amount-error" role="alert" className="text-sm text-rose-600">
              נא להזין סכום חיובי, עם עד 2 ספרות אחרי הנקודה
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">קטגוריה</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            {categoriesOfType.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">תאריך</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">הערה (לא חובה)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </label>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="submit"
            className="min-h-14 rounded-2xl bg-indigo-600 text-lg font-semibold text-white hover:bg-indigo-700 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            שמירה
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 rounded-2xl bg-white text-lg font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-4 focus-visible:outline-indigo-300"
          >
            ביטול
          </button>
        </div>
      </form>
    </main>
  )
}
