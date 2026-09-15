// Shared types between frontend and backend for the Calendar Automation API.

export interface ScheduleEntryDTO {
  id: string
  uploadId: string
  courseCode: string
  courseName: string | null
  room: string | null
  dayOfWeek: string // MO | TU | WE | TH | FR | SA | SU
  startTime: string // HH:MM
  endTime: string // HH:MM
  color: string | null
  notes: string | null
  calendarEventId: string | null
}

export interface SyncLogDTO {
  id: string
  syncedAt: string
  untilDate: string | null
  result: string
  errorMessage: string | null
  entriesCount: number
}

export interface ScheduleUploadDTO {
  id: string
  imageUrl: string
  imageName: string | null
  status: string
  untilDate: string | null
  timezone: string
  createdAt: string
  entries: ScheduleEntryDTO[]
  logs: SyncLogDTO[]
}

export interface SessionDTO {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export interface ApiError {
  error: string
  detail?: string
}

export interface ExtractResponse {
  uploadId: string
  entries: ScheduleEntryDTO[]
  rawExtraction: string
}

export interface SyncResponse {
  uploadId: string
  status: string
  untilDate: string
  entriesCount: number
  icsUrl: string
  downloadUrl: string
}

export interface UpsertEntryInput {
  id?: string
  courseCode: string
  courseName?: string | null
  room?: string | null
  dayOfWeek: string
  startTime: string
  endTime: string
  color?: string | null
  notes?: string | null
}

export const DAY_LABELS: Record<string, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}

export const DAY_OPTIONS = [
  { value: 'MO', label: 'Monday' },
  { value: 'TU', label: 'Tuesday' },
  { value: 'WE', label: 'Wednesday' },
  { value: 'TH', label: 'Thursday' },
  { value: 'FR', label: 'Friday' },
  { value: 'SA', label: 'Saturday' },
  { value: 'SU', label: 'Sunday' },
]

// A palette of pleasant colors used to color-tag courses in the UI / ICS export.
export const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#6366f1', // indigo (allowed here since user-chosen palette, not primary UI)
]
