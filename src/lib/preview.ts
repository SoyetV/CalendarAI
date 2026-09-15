import type { ScheduleEntryDTO } from './types'
import { DAY_OPTIONS } from './types'

// Compute the next `weeks` weeks of occurrences for a set of entries, starting
// from `startOn`. Returns an array of weeks; each week is an object keyed by
// day-of-week (MO..SU) with the list of entries that fall on that day, plus the
// concrete date for that weekday in that week.
export interface PreviewWeek {
  weekStart: Date // the Monday of this week
  days: Array<{
    dayOfWeek: string
    date: Date
    entries: ScheduleEntryDTO[]
  }>
}

function startOfWeekMonday(d: Date): Date {
  const dt = new Date(d.getTime())
  const day = dt.getUTCDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // days since Monday
  dt.setUTCDate(dt.getUTCDate() - diff)
  dt.setUTCHours(0, 0, 0, 0)
  return dt
}

export function buildPreviewWeeks(
  entries: ScheduleEntryDTO[],
  startOn: Date,
  weeks: number,
): PreviewWeek[][] {
  if (entries.length === 0) return []
  const result: PreviewWeek[][] = []
  const monday = startOfWeekMonday(startOn)
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(monday.getTime() + w * 7 * 24 * 60 * 60 * 1000)
    const days = DAY_OPTIONS.map((opt, i) => {
      const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000)
      const dayEntries = entries
        .filter((e) => e.dayOfWeek === opt.value)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
      return { dayOfWeek: opt.value, date, entries: dayEntries }
    })
    result.push([{ weekStart, days }])
  }
  // Flatten — we return a flat list of weeks for simplicity of rendering.
  return result
}

// Estimate a default end date: ~16 weeks (a typical term) from today.
export function defaultUntilDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 16 * 7)
  return d.toISOString().slice(0, 10)
}

// Count how many total occurrences an entry produces between startOn and untilDate.
export function countOccurrences(
  entry: ScheduleEntryDTO,
  startOn: Date,
  untilDate: string,
): number {
  const until = new Date(untilDate + 'T23:59:59Z').getTime()
  const dayNum = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }[entry.dayOfWeek]
  if (dayNum === undefined) return 0
  let count = 0
  const dt = startOfWeekMonday(startOn)
  // Advance to the first matching weekday on/after startOn.
  while (dt.getUTCDay() !== dayNum) dt.setUTCDate(dt.getUTCDate() + 1)
  while (dt.getTime() <= until) {
    count++
    dt.setUTCDate(dt.getUTCDate() + 7)
  }
  return count
}
