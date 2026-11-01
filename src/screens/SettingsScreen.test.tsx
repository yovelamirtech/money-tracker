import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { createDefaultAppData } from '../lib/appData'
import { createBackup } from '../lib/backup'
import { loadData, saveData } from '../lib/storage'
import { makeTransaction } from '../test/factories'

let downloads: { name: string; blob: Blob }[] = []

beforeEach(() => {
  downloads = []
  const blobs = new Map<string, Blob>()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      const url = `blob:${blobs.size}`
      blobs.set(url, blob)
      return url
    },
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: blobs.get(this.getAttribute('href') ?? '') as Blob })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function openSettings() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'הגדרות' }))
  return user
}

function backupFile(content: string) {
  return new File([content], 'backup.json', { type: 'application/json' })
}

describe('backup (4.2)', () => {
  it('exports all data as a JSON backup file', async () => {
    saveData({ ...createDefaultAppData(), transactions: [makeTransaction({ note: 'שלום' })] })
    const user = await openSettings()

    await user.click(screen.getByRole('button', { name: 'ייצוא גיבוי (JSON)' }))

    expect(downloads).toHaveLength(1)
    expect(downloads[0].name).toMatch(/^money-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const file = JSON.parse(await downloads[0].blob.text())
    expect(file.format).toBe('money-tracker-backup')
    expect(file.data.transactions[0].note).toBe('שלום')
  })

  it('imports a valid backup after confirmation, replacing the data', async () => {
    saveData({ ...createDefaultAppData(), transactions: [makeTransaction({ id: 'old' })] })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await openSettings()

    const imported = { ...createDefaultAppData(), transactions: [makeTransaction({ id: 'new1' }), makeTransaction({ id: 'new2' })] }
    await user.upload(screen.getByLabelText('ייבוא גיבוי'), backupFile(createBackup(imported, '2026-11-01T00:00:00Z')))

    expect(confirm).toHaveBeenCalledWith('הייבוא יחליף את כל הנתונים הנוכחיים (1 תנועות). להמשיך?')
    expect(await screen.findByText('הגיבוי יובא: 2 תנועות')).toBeInTheDocument()
    expect(loadData().transactions.map((t) => t.id)).toEqual(['new1', 'new2'])
  })

  it('keeps the current data when the import is not confirmed', async () => {
    saveData({ ...createDefaultAppData(), transactions: [makeTransaction({ id: 'old' })] })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = await openSettings()

    await user.upload(screen.getByLabelText('ייבוא גיבוי'), backupFile(createBackup(createDefaultAppData(), 'x')))

    expect(loadData().transactions.map((t) => t.id)).toEqual(['old'])
  })

  it.each([
    ['{not json', 'הקובץ אינו JSON תקין'],
    ['{"hello":1}', 'זה לא קובץ גיבוי של מעקב כסף'],
    [
      JSON.stringify({ format: 'money-tracker-backup', version: 1, data: { transactions: [{ id: 1 }], categories: [] } }),
      'הנתונים בקובץ לא תקינים',
    ],
  ])('shows an error and changes nothing for an invalid file: %s', async (content, reason) => {
    saveData({ ...createDefaultAppData(), transactions: [makeTransaction({ id: 'old' })] })
    const confirm = vi.spyOn(window, 'confirm')
    const user = await openSettings()

    await user.upload(screen.getByLabelText('ייבוא גיבוי'), backupFile(content))

    expect(await screen.findByRole('alert')).toHaveTextContent(`הקובץ לא יובא: ${reason}`)
    expect(confirm).not.toHaveBeenCalled()
    expect(loadData().transactions.map((t) => t.id)).toEqual(['old'])
  })
})

describe('CSV export (4.3)', () => {
  it('exports only the transactions in the chosen range', async () => {
    saveData({
      ...createDefaultAppData(),
      transactions: [
        makeTransaction({ date: '2026-01-31', amountAgorot: 100 }),
        makeTransaction({ date: '2026-02-01', amountAgorot: 1250, categoryId: 'groceries', note: 'פלאפל' }),
        makeTransaction({ date: '2026-02-28', amountAgorot: 500000, type: 'income', categoryId: 'salary' }),
        makeTransaction({ date: '2026-03-01', amountAgorot: 300 }),
      ],
    })
    const user = await openSettings()

    const from = screen.getByLabelText('מתאריך')
    const to = screen.getByLabelText('עד תאריך')
    await user.clear(from)
    await user.type(from, '2026-02-01')
    await user.clear(to)
    await user.type(to, '2026-02-28')
    expect(screen.getByText('2 תנועות בטווח')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'הורדת CSV' }))

    expect(downloads[0].name).toBe('money-tracker-2026-02-01-2026-02-28.csv')
    // Starts with a UTF-8 BOM so Excel shows Hebrew correctly (blob.text() drops the BOM when decoding).
    const bytes = new Uint8Array(await downloads[0].blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(await downloads[0].blob.text()).toBe(
      'תאריך,סוג,קטגוריה,סכום,הערה\r\n' +
        '2026-02-01,הוצאה,סופר,12.50,פלאפל\r\n' +
        '2026-02-28,הכנסה,משכורת,5000.00,\r\n',
    )
  })
})
