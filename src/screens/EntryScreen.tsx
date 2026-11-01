import { useRef, useState, type FormEvent } from 'react'
import TransactionList from '../components/TransactionList'
import { fieldClass, focusRing, primaryButton } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { parseEntry, recentEntries, uncategorizedQueue } from '../lib/entry'
import { formatILS } from '../lib/money'
import type { Category, Transaction } from '../lib/types'

/** How many of the latest entries are listed for a quick fix. */
const RECENT_COUNT = 15

interface EntryScreenProps {
  transactions: Transaction[]
  categories: Category[]
  /** Saves the entry and returns the transaction it became (with the guessed category, if any). */
  onAdd: (entry: { amountAgorot: number; note: string }) => Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onSort: () => void
  onDetailedAdd: () => void
}

/** The home screen: type "שכ״ד 4000", send, done. The latest entries are right below for a quick fix. */
export default function EntryScreen({
  transactions,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onSort,
  onDetailedAdd,
}: EntryScreenProps) {
  const { t, categoryName } = useI18n()
  const [text, setText] = useState('')
  const [error, setError] = useState<'entryNoAmount' | 'entryBadAmount' | null>(null)
  const [status, setStatus] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const uncategorizedCount = uncategorizedQueue(transactions).length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    const parsed = parseEntry(text)
    if (!parsed.ok) {
      setError(parsed.error === 'no-amount' ? 'entryNoAmount' : 'entryBadAmount')
      setStatus('')
      return
    }
    const saved = onAdd(parsed)
    const name = categoryName(categories.find((c) => c.id === saved.categoryId))
    setStatus(t('entryAdded', { note: parsed.note, amount: formatILS(parsed.amountAgorot), name }).replace(/\s+/g, ' '))
    setText('')
    setError(null)
    // Ready for the next one without tapping the field again.
    input.current?.focus()
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            ref={input}
            type="text"
            enterKeyHint="send"
            autoComplete="off"
            autoFocus
            aria-label={t('entryInputLabel')}
            aria-invalid={error !== null}
            aria-describedby={error ? 'entry-error' : undefined}
            placeholder={t('entryPlaceholder')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            className={`${fieldClass} min-h-14 min-w-0 flex-1 ${error ? 'border-expense' : ''}`}
          />
          <button type="submit" className={`${primaryButton} min-h-14 shrink-0`}>
            {t('entrySend')}
          </button>
        </div>
        {error && (
          <p id="entry-error" role="alert" className="text-sm text-expense">
            {t(error)}
          </p>
        )}
        <p role="status" className="text-sm text-muted empty:hidden">
          {status}
        </p>
      </form>

      {uncategorizedCount > 0 && (
        <button
          type="button"
          onClick={onSort}
          className={`min-h-12 rounded-2xl bg-warn-soft px-4 text-start font-semibold text-fg ${focusRing}`}
        >
          <span aria-hidden="true">🗂️ </span>
          {t('sortButton', { count: uncategorizedCount })}
        </button>
      )}

      <h1 tabIndex={-1} className="text-lg font-bold outline-none">
        {t('entryTitle')}
      </h1>
      <TransactionList
        transactions={recentEntries(transactions, RECENT_COUNT)}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
        label={t('recentLabel')}
        emptyText={t('entryEmpty')}
        noteFirst
      />

      <button type="button" onClick={onDetailedAdd} className={`self-center rounded-xl px-3 py-2 text-accent-text ${focusRing}`}>
        {t('detailedAdd')}
      </button>
    </main>
  )
}
