import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/factories'
import { csvCell, transactionsToCsv, type CsvLabels } from './csv'

const labels: CsvLabels = {
  headers: ['Date', 'Type', 'Category', 'Amount', 'Note'],
  types: { income: 'Income', expense: 'Expense' },
}
const names: Record<string, string> = { food: 'Food', salary: 'Salary' }

describe('csvCell', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('hello')).toBe('hello')
    expect(csvCell('אוכל')).toBe('אוכל')
    expect(csvCell('')).toBe('')
  })

  it('quotes values with commas, quotes or line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('defuses values that a spreadsheet would run as a formula', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('+972')).toBe("'+972")
    expect(csvCell('-5')).toBe("'-5")
    expect(csvCell('@me')).toBe("'@me")
    expect(csvCell('=1,2')).toBe(`"'=1,2"`)
  })
})

describe('transactionsToCsv', () => {
  it('writes a header and one row per transaction, oldest first, with CRLF', () => {
    const csv = transactionsToCsv(
      [
        makeTransaction({ date: '2026-10-20', amountAgorot: 1250, categoryId: 'food', note: 'פלאפל, חומוס' }),
        makeTransaction({ date: '2026-10-01', type: 'income', amountAgorot: 1200000, categoryId: 'salary' }),
      ],
      (id) => names[id] ?? id,
      labels,
    )
    expect(csv).toBe(
      'Date,Type,Category,Amount,Note\r\n' +
        '2026-10-01,Income,Salary,12000.00,\r\n' +
        '2026-10-20,Expense,Food,12.50,"פלאפל, חומוס"\r\n',
    )
  })

  it('writes only the header for no transactions', () => {
    expect(transactionsToCsv([], (id) => id, labels)).toBe('Date,Type,Category,Amount,Note\r\n')
  })
})
