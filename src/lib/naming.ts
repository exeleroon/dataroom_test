/** Helpers for keeping names unique within a folder, mirroring OS file managers. */

/** Raised when a rename/create would collide with a sibling of the same name. */
export class DuplicateNameError extends Error {
  constructor(name: string) {
    super(`An item named "${name}" already exists here.`)
    this.name = 'DuplicateNameError'
  }
}

/** Normalize a name for storage/comparison: trim ends and collapse internal runs of whitespace. */
export const trimName = (name: string) => name.trim().replace(/\s+/g, ' ')

/**
 * Split a filename into base + extension so we can suffix the base and keep the
 * extension last, e.g. "report.pdf" -> ["report", ".pdf"].
 */
function splitExtension(name: string): [string, string] {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return [name, '']
  return [name.slice(0, dot), name.slice(dot)]
}

/**
 * Return a name that does not collide with `existing` (case-insensitive),
 * appending " (1)", " (2)"… before the extension when needed.
 */
export function makeUniqueName(desired: string, existing: string[]): string {
  // Normalize existing names the same way as `desired` so the comparison is symmetric.
  const taken = new Set(existing.map((n) => trimName(n).toLowerCase()))
  const clean = trimName(desired)
  if (!taken.has(clean.toLowerCase())) return clean

  const [base, ext] = splitExtension(clean)
  let counter = 1
  let candidate = `${base} (${counter})${ext}`
  while (taken.has(candidate.toLowerCase())) {
    counter += 1
    candidate = `${base} (${counter})${ext}`
  }
  return candidate
}

/** True when `name` already exists in `existing` (case-insensitive, whitespace-normalized). */
export function nameExists(name: string, existing: string[]): boolean {
  const clean = trimName(name).toLowerCase()
  return existing.some((n) => trimName(n).toLowerCase() === clean)
}
