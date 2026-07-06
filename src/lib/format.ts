/** Human-readable file size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  // Clamp into a valid unit index (also guards sub-1-byte fractional inputs).
  let exponent = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1),
  )
  let rounded = exponent === 0 ? bytes : Math.round((bytes / 1024 ** exponent) * 10) / 10
  // Rounding can push the mantissa up to 1024 (e.g. 1048575 B -> "1024 KB"); roll over.
  if (rounded >= 1024 && exponent < units.length - 1) {
    exponent += 1
    rounded = Math.round((bytes / 1024 ** exponent) * 10) / 10
  }
  return `${rounded} ${units[exponent]}`
}

/** Absolute date + 24h time, e.g. "Jul 2, 2026, 14:30". Used for hover tooltips. */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const relativeTime = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })

// Largest unit first isn't possible with a single divisor chain, so we walk from
// the smallest unit up, dividing the remaining duration by each threshold.
const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/** Relative time, e.g. "10 minutes ago", "yesterday", "just now". */
export function formatRelativeTime(timestamp: number): string {
  let duration = (timestamp - Date.now()) / 1000 // seconds; negative for the past
  if (Math.abs(duration) < 45) return 'just now'
  for (const { amount, unit } of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < amount) return relativeTime.format(Math.round(duration), unit)
    duration /= amount
  }
  return relativeTime.format(Math.round(duration), 'year')
}
