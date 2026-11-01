import { useState, type ChangeEvent } from 'react'
import { downloadFile } from '../browser/download'
import ScreenHeader from '../components/ScreenHeader'
import SegmentedControl from '../components/SegmentedControl'
import { card, fieldClass, focusRing, secondaryButton, sectionTitle } from '../components/ui'
import { useI18n } from '../i18n/i18n'
import type { MessageKey } from '../i18n/messages'
import { createBackup, parseBackup, type BackupError } from '../lib/backup'
import { transactionsToCsv } from '../lib/csv'
import { filterByDateRange } from '../lib/filter'
import { firstDayOfMonth, lastDayOfMonth, todayISO, toMonthKey } from '../lib/month'
import type { AppData, Language, Settings, ThemeSetting } from '../lib/types'

export type ManageView = 'categories' | 'recurring' | 'budgets'

interface SettingsScreenProps {
  data: AppData
  onSettingsChange: (changes: Partial<Settings>) => void
  onOpen: (view: ManageView) => void
  onImport: (data: AppData) => void
}

const backupErrorMessages: Record<BackupError, MessageKey> = {
  'invalid-json': 'errInvalidJson',
  'wrong-format': 'errWrongFormat',
  'newer-version': 'errNewerVersion',
  'not-an-object': 'errInvalidData',
  'invalid-transactions': 'errInvalidData',
  'invalid-categories': 'errInvalidData',
  'invalid-recurring': 'errInvalidData',
  'invalid-budgets': 'errInvalidData',
  'duplicate-ids': 'errDuplicateIds',
  'unknown-category': 'errUnknownCategory',
}

export default function SettingsScreen({ data, onSettingsChange, onOpen, onImport }: SettingsScreenProps) {
  const { t, categoryName } = useI18n()
  const currentMonth = toMonthKey(todayISO())
  const [from, setFrom] = useState(firstDayOfMonth(currentMonth))
  const [to, setTo] = useState(lastDayOfMonth(currentMonth))
  const [importStatus, setImportStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const inRange = filterByDateRange(data.transactions, from, to)

  function exportBackup() {
    downloadFile(`money-tracker-backup-${todayISO()}.json`, createBackup(data, new Date().toISOString()), 'application/json')
  }

  function exportCsv() {
    const names = new Map(data.categories.map((c) => [c.id, categoryName(c)]))
    const csv = transactionsToCsv(inRange, (id) => names.get(id) ?? t('uncategorized'), {
      headers: [t('csvDate'), t('csvType'), t('csvCategory'), t('csvAmount'), t('csvNote')],
      types: { income: t('incomeOne'), expense: t('expenseOne') },
    })
    // The BOM makes Excel read the Hebrew text as UTF-8.
    downloadFile(`money-tracker-${from || 'start'}-${to || 'end'}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = '' // so choosing the same file again still fires a change
    if (!file) return

    const result = parseBackup(await file.text())
    if (!result.ok) {
      setImportStatus({ ok: false, text: t('importError', { reason: t(backupErrorMessages[result.error]) }) })
      return
    }
    if (!window.confirm(t('importConfirm', { count: data.transactions.length }))) return
    onImport(result.data)
    setImportStatus({ ok: true, text: t('importSuccess', { count: result.data.transactions.length }) })
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-24">
      <ScreenHeader title={t('settingsTitle')} />

      <section aria-labelledby="appearance-title" className={card}>
        <h2 id="appearance-title" className={sectionTitle}>
          {t('appearance')}
        </h2>
        <SegmentedControl<ThemeSetting>
          label={t('appearance')}
          size="sm"
          value={data.settings.theme}
          onChange={(theme) => onSettingsChange({ theme })}
          options={[
            { value: 'system', label: t('themeSystem') },
            { value: 'light', label: t('themeLight') },
            { value: 'dark', label: t('themeDark') },
          ]}
        />
        <h2 id="language-title" className={`${sectionTitle} mt-5`}>
          {t('language')}
        </h2>
        <SegmentedControl<Language>
          label={t('language')}
          size="sm"
          value={data.settings.language}
          onChange={(language) => onSettingsChange({ language })}
          options={[
            { value: 'he', label: 'עברית' },
            { value: 'en', label: 'English' },
          ]}
        />
      </section>

      <section aria-labelledby="manage-title" className={card}>
        <h2 id="manage-title" className={sectionTitle}>
          {t('manage')}
        </h2>
        <ul className="flex flex-col gap-2">
          {(
            [
              ['categories', 'categoriesTitle'],
              ['recurring', 'recurringTitle'],
              ['budgets', 'budgetsTitle'],
            ] as const
          ).map(([view, label]) => (
            <li key={view}>
              <button type="button" onClick={() => onOpen(view)} className={`${secondaryButton} flex w-full items-center justify-between`}>
                {t(label)}
                <span aria-hidden="true" className="text-muted">
                  ‹
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data-title" className={card}>
        <h2 id="data-title" className={sectionTitle}>
          {t('data')}
        </h2>
        <p className="mb-3 text-sm text-muted">{t('dataHint')}</p>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={exportBackup} className={secondaryButton}>
            {t('exportBackup')}
          </button>
          <label className={`${secondaryButton} flex cursor-pointer items-center justify-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus`}>
            {t('importBackup')}
            <input type="file" accept="application/json,.json" onChange={handleImportFile} className="sr-only" />
          </label>
          {importStatus && (
            <p role={importStatus.ok ? 'status' : 'alert'} className={`text-sm ${importStatus.ok ? 'text-income' : 'text-expense'}`}>
              {importStatus.text}
            </p>
          )}
        </div>

        <h3 className="mt-5 mb-2 font-bold">{t('csvExport')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('csvFrom')}</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('csvTo')}</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <p role="status" className="my-2 text-sm text-muted">
          {t('csvCount', { count: inRange.length })}
        </p>
        <button type="button" onClick={exportCsv} className={`${secondaryButton} w-full ${focusRing}`}>
          {t('csvButton')}
        </button>
      </section>
    </main>
  )
}
