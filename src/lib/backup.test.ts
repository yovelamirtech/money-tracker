import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/factories'
import { createDefaultAppData } from './appData'
import { BACKUP_FORMAT, createBackup, parseBackup } from './backup'

function sampleData() {
  return { ...createDefaultAppData(), transactions: [makeTransaction({ note: 'שלום' })] }
}

describe('backup', () => {
  it('export → import round-trip returns the same data', () => {
    const data = sampleData()
    expect(parseBackup(createBackup(data, '2026-11-01T10:00:00.000Z'))).toEqual({ ok: true, data })
  })

  it('writes the format, version and export time', () => {
    const file = JSON.parse(createBackup(sampleData(), '2026-11-01T10:00:00.000Z'))
    expect(file).toMatchObject({ format: BACKUP_FORMAT, version: 1, exportedAt: '2026-11-01T10:00:00.000Z' })
  })

  it('rejects text that is not JSON', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'invalid-json' })
  })

  it.each([['null'], ['[]'], ['{"transactions":[]}'], ['{"format":"other","version":1,"data":{}}']])(
    'rejects JSON that is not a backup file: %s',
    (text) => {
      expect(parseBackup(text)).toEqual({ ok: false, error: 'wrong-format' })
    },
  )

  it('rejects a backup from a newer version of the app', () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: 99, data: sampleData() })
    expect(parseBackup(text)).toEqual({ ok: false, error: 'newer-version' })
  })

  it('rejects a backup with invalid data', () => {
    const data = { ...sampleData(), transactions: [{ ...makeTransaction(), amountAgorot: 12.5 }] }
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: 1, data })
    expect(parseBackup(text)).toEqual({ ok: false, error: 'invalid-transactions' })
  })
})
