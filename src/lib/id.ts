/**
 * Generate a collision-resistant id. Prefers the native crypto.randomUUID
 * and falls back to a timestamp+random string for older runtimes.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
