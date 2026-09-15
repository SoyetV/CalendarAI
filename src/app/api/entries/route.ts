import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import type { ApiError, ScheduleEntryDTO, UpsertEntryInput } from '@/lib/types'

const VALID_DAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])

function validateTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s) && Number(s.slice(0, 2)) <= 23 && Number(s.slice(3)) <= 59
}

// Create a new entry on an existing upload.
export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { uploadId?: string; entry?: UpsertEntryInput }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.uploadId || !body.entry) {
    return NextResponse.json<ApiError>({ error: 'uploadId and entry are required' }, { status: 400 })
  }
  const e = body.entry
  if (!e.courseCode?.trim()) {
    return NextResponse.json<ApiError>({ error: 'courseCode is required' }, { status: 400 })
  }
  if (!e.dayOfWeek || !VALID_DAYS.has(e.dayOfWeek)) {
    return NextResponse.json<ApiError>({ error: 'Invalid dayOfWeek' }, { status: 400 })
  }
  if (!validateTime(e.startTime) || !validateTime(e.endTime)) {
    return NextResponse.json<ApiError>({ error: 'startTime/endTime must be HH:MM' }, { status: 400 })
  }

  const upload = await db.scheduleUpload.findUnique({ where: { id: body.uploadId } })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Upload not found' }, { status: 404 })
  }

  const created = await db.scheduleEntry.create({
    data: {
      uploadId: upload.id,
      userId: user.id,
      courseCode: e.courseCode.trim(),
      courseName: e.courseName?.trim() || null,
      room: e.room?.trim() || null,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      color: e.color || null,
      notes: e.notes?.trim() || null,
    },
  })

  const dto: ScheduleEntryDTO = {
    id: created.id,
    uploadId: created.uploadId,
    courseCode: created.courseCode,
    courseName: created.courseName,
    room: created.room,
    dayOfWeek: created.dayOfWeek,
    startTime: created.startTime,
    endTime: created.endTime,
    color: created.color,
    notes: created.notes,
    calendarEventId: created.calendarEventId,
  }
  return NextResponse.json<ScheduleEntryDTO>(dto)
}
