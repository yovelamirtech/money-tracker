import { validateAppData, type AppDataError } from './appData'
import type { AppData } from './types'
import { isRecord } from './validate'

export const BACKUP_FORMAT = 'money-tracker-backup'
export const BACKUP_VERSION = 1

interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  data: AppData
}

export function createBackup(data: AppData, exportedAt: string): string {
  const file: BackupFile = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data }
  return JSON.stringify(file, null, 2)
}

export type BackupError = 'invalid-json' | 'wrong-format' | 'newer-version' | AppDataError

/** Reads a backup file's text. The data is fully validated; nothing is imported if any part is wrong. */
export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: BackupError } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || typeof raw.version !== 'number') {
    return { ok: false, error: 'wrong-format' }
  }
  if (raw.version > BACKUP_VERSION) return { ok: false, error: 'newer-version' }
  return validateAppData(raw.data)
}
