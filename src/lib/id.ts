/** Unique id. crypto.randomUUID only exists on https/localhost, so fall back for plain http (e.g. phone on LAN). */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
