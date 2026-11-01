import { useEffect, useRef, useState, type FormEvent } from 'react'
import TransactionList from '../components/TransactionList'
import { focusRing } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import { guessCategory, parseEntry, recentEntries, uncategorizedQueue } from '../lib/entry'
import { formatILS } from '../lib/money'
import type { Category, NoteRule, Transaction } from '../lib/types'

/** How many of the latest entries are listed for a quick fix. */
const RECENT_COUNT = 15
/** How long a just-added row stays highlighted. */
const FLASH_MS = 1800

interface EntryScreenProps {
  transactions: Transaction[]
  categories: Category[]
  noteRules: NoteRule[]
  /** Saves the entry and returns the transaction it became (with the guessed category, if any). */
  onAdd: (entry: { amountAgorot: number; note: string }) => Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onSort: () => void
  onDetailedAdd: () => void
}

/**
 * The home screen, built like a chat: the entry bar sits at the bottom, in thumb reach (and right on
 * the keyboard when it's open), and the latest entries are just above it, newest last.
 */
export default function EntryScreen({
  transactions,
  categories,
  noteRules,
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
  const [flashId, setFlashId] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const listEnd = useRef<HTMLDivElement>(null)

  const recent = recentEntries(transactions, RECENT_COUNT).reverse()
  const uncategorizedCount = uncategorizedQueue(transactions).length
  const nameOf = (id: string) => categoryName(categories.find((c) => c.id === id))

  // The newest entries are at the bottom, next to the entry bar: start there, and follow new ones.
  const newestId = recent.at(-1)?.id
  useEffect(() => {
    listEnd.current?.scrollIntoView?.({ block: 'end' })
  }, [newestId])

  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => setFlashId(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flashId])

  // What the line will become, shown while typing: "₪314.00 · רכב".
  const parsed = parseEntry(text)
  const guess = parsed.ok ? guessCategory(parsed.note, noteRules, categories) : undefined
  const preview = parsed.ok ? `${formatILS(parsed.amountAgorot)} · ${categoryName(guess)}` : ''

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    if (!parsed.ok) {
      setError(parsed.error === 'no-amount' ? 'entryNoAmount' : 'entryBadAmount')
      return
    }
    const saved = onAdd(parsed)
    const message = t('entryAdded', { note: parsed.note, amount: formatILS(parsed.amountAgorot), name: nameOf(saved.categoryId) })
    setStatus(message.replace(/\s+/g, ' '))
    setFlashId(saved.id)
    setText('')
    setError(null)
    // Ready for the next one without tapping the field again.
    input.current?.focus()
  }

  return (
    <main className="flex flex-col gap-3 p-4 pb-[calc(4rem+env(safe-area-inset-bottom)+8.5rem)]">
      <div className="flex flex-col gap-2">
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
        <button type="button" onClick={onDetailedAdd} className={`self-start rounded-xl py-2 text-sm text-accent-text ${focusRing}`}>
          {t('detailedAdd')}
        </button>
      </div>

      <h1 tabIndex={-1} className="text-lg font-bold outline-none">
        {t('entryTitle')}
      </h1>
      <TransactionList
        transactions={recent}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
        label={t('recentLabel')}
        emptyText={t('entryEmpty')}
        noteFirst
        highlightId={flashId}
      />
      {/* The scroll margin keeps the newest entry above the entry bar and the tab bar, not behind them. */}
      <div ref={listEnd} className="scroll-mb-[calc(4rem+env(safe-area-inset-bottom)+7rem)]" />

      {/* The entry bar: above the tab bar, or right on the keyboard while it's open (see useKeyboardInset). */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-app/95 px-4 pt-2 pb-3 backdrop-blur [.kb-open_&]:bottom-[var(--kb,0px)]"
      >
        <div className="mx-auto flex max-w-md flex-col gap-1">
          <div className="min-h-5 truncate px-1 text-sm">
            {error ? (
              <p id="entry-error" role="alert" className="text-expense">
                {t(error)}
              </p>
            ) : (
              text.trim() !== '' && (
                <p dir="auto" className="text-muted">
                  {preview}
                </p>
              )
            )}
            {/* Read out once after sending; hidden while typing the next one. */}
            <p role="status" className="text-muted">
              {!error && text.trim() === '' ? status : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={input}
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              autoFocus
              data-autofocus
              aria-label={t('entryInputLabel')}
              aria-invalid={error !== null}
              aria-describedby={error ? 'entry-error' : undefined}
              placeholder={t('entryPlaceholder')}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              className={`min-h-12 min-w-0 flex-1 rounded-full border bg-card px-4 text-lg text-fg focus:border-accent focus:outline-2 focus:outline-focus ${
                error ? 'border-expense' : 'border-field'
              }`}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label={t('entrySend')}
              className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl text-on-accent hover:bg-accent-hover disabled:bg-subtle disabled:text-muted ${focusRing}`}
            >
              {/* An arrow pointing up, like a chat's send button */}
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
