import type { ScheduleEntry } from '@prisma/client'

// ICS date-times are UTC, format YYYYMMDDTHHMMSSZ.
function toIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function toIcsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// Parse "HH:MM" (24h, local) into { h, m }.
function parseHM(s: string): { h: number; m: number } | null {
  const m = s.match(/^(\d{2}):(\d{2})$/)
  if (!m) return null
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) }
}

// Convert a local (Asia/Shanghai) wall-clock time on a given date to a UTC Date.
// We use a fixed +08:00 offset since the app treats all times as Asia/Shanghai.
function localToUtc(dateYmd: { y: number; mo: number; d: number }, hm: { h: number; m: number }): Date {
  const y = String(dateYmd.y).padStart(4, '0')
  const mo = String(dateYmd.mo).padStart(2, '0')
  const d = String(dateYmd.d).padStart(2, '0')
  const h = String(hm.h).padStart(2, '0')
  const mi = String(hm.m).padStart(2, '0')
  // Construct as UTC then subtract 8 hours to get the UTC instant that
  // corresponds to +08:00 wall-clock.
  const asIfUtc = Date.UTC(dateYmd.y, dateYmd.mo - 1, dateYmd.d, hm.h, hm.m, 0)
  const utc = asIfUtc - 8 * 60 * 60 * 1000
  return new Date(utc)
  // (y, mo, d, h, mi kept for reference / future TZ-aware versions)
  void y; void mo; void d; void h; void mi
}

const DAY_TO_NUM: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

export interface IcsEventGroup {
  key: string
  courseCode: string
  courseName: string | null
  room: string | null
  startTime: string
  endTime: string
  color: string | null
  notes: string | null
  days: string[] // MO, WE, FR ...
  entryIds: string[]
}

export function groupEntriesForIcs(entries: ScheduleEntry[]): IcsEventGroup[] {
  const map = new Map<string, IcsEventGroup>()
  for (const e of entries) {
    const key = `${e.courseCode}__${e.courseName ?? ''}__${e.room ?? ''}__${e.startTime}__${e.endTime}__${e.color ?? ''}__${e.notes ?? ''}`
    let g = map.get(key)
    if (!g) {
      g = {
        key,
        courseCode: e.courseCode,
        courseName: e.courseName,
        room: e.room,
        startTime: e.startTime,
        endTime: e.endTime,
        color: e.color,
        notes: e.notes,
        days: [],
        entryIds: [],
      }
      map.set(key, g)
    }
    if (!g.days.includes(e.dayOfWeek)) g.days.push(e.dayOfWeek)
    g.entryIds.push(e.id)
  }
  // Sort days by weekday order for stable, readable RRULEs.
  for (const g of map.values()) {
    g.days.sort((a, b) => (DAY_TO_NUM[a] ?? 9) - (DAY_TO_NUM[b] ?? 9))
  }
  return Array.from(map.values())
}

function escapeIcs(text: string | null): string {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// Pick the first occurrence date (in local Y/M/D) on or after `startOn` that
// falls on one of the given weekdays.
function firstOccurrenceYMD(startOn: Date, days: string[]): { y: number; mo: number; d: number } {
  const allowed = new Set(days.map((d) => DAY_TO_NUM[d] ?? -1))
  const dt = new Date(startOn.getTime())
  // Search up to 14 days forward for a matching weekday.
  for (let i = 0; i < 14; i++) {
    if (allowed.has(dt.getUTCDay())) {
      return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
    }
    dt.setUTCDate(dt.getUTCDate() + 1)
  }
  return { y: startOn.getUTCFullYear(), mo: startOn.getUTCMonth() + 1, d: startOn.getUTCDate() }
}

export interface IcsBuildOptions {
  uploadId: string
  entries: ScheduleEntry[]
  untilDate: string // ISO yyyy-mm-dd
  timezone?: string // informational only (defaults Asia/Shanghai)
  startFrom?: Date // first allowed occurrence on/after this date
}

export interface IcsBuildResult {
  ics: string
  groups: IcsEventGroup[]
  eventUids: Record<string, string> // entryId -> ics UID
}

export function buildIcs(opts: IcsBuildOptions): IcsBuildResult {
  const { uploadId, entries, untilDate, timezone = 'Asia/Shanghai', startFrom } = opts
  const groups = groupEntriesForIcs(entries)
  const startOn = startFrom ?? new Date()
  const until = new Date(untilDate + 'T23:59:59Z')
  const untilIcs = toIcsDateTime(until)

  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Calendar Automation//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push(`X-WR-TIMEZONE:${timezone}`)

  const eventUids: Record<string, string> = {}

  for (const g of groups) {
    const startHm = parseHM(g.startTime)
    const endHm = parseHM(g.endTime)
    if (!startHm || !endHm) continue
    const firstOcc = firstOccurrenceYMD(startOn, g.days)
    const dtStart = localToUtc(firstOcc, startHm)
    const dtEnd = localToUtc(firstOcc, endHm)
    const uid = `${uploadId}-${g.key}@calendar-automation.local`

    // Record the UID against every underlying entry so we can store it as
    // calendarEventId in the DB for later delete/re-sync.
    for (const id of g.entryIds) eventUids[id] = uid

    const summary = g.courseName ? `${g.courseCode} — ${g.courseName}` : g.courseCode
    const location = g.room ?? ''
    const descriptionParts = [g.courseCode]
    if (g.courseName) descriptionParts.push(g.courseName)
    if (g.notes) descriptionParts.push(g.notes)
    if (g.room) descriptionParts.push(`Room: ${g.room}`)
    descriptionParts.push(`Repeats weekly (${g.days.join(',')}) until ${untilDate}`)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${toIcsDateTime(new Date())}`)
    lines.push(`DTSTART:${toIcsDateTime(dtStart)}`)
    lines.push(`DTEND:${toIcsDateTime(dtEnd)}`)
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${g.days.join(',')};UNTIL=${untilIcs}`)
    lines.push(`SUMMARY:${escapeIcs(summary)}`)
    if (location) lines.push(`LOCATION:${escapeIcs(location)}`)
    lines.push(`DESCRIPTION:${escapeIcs(descriptionParts.join(' // '))}`)
    if (g.color) lines.push(`COLOR:${escapeIcs(g.color)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  // CRLF line endings per RFC 5545.
  const ics = lines.join('\r\n')
  return { ics, groups, eventUids }
}
