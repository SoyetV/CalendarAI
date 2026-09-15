import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import type { ApiError, ScheduleEntryDTO, UpsertEntryInput } from '@/lib/types'

const VALID_DAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])

function validateTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s) && Number(s.slice(0, 2)) <= 23 && Number(s.slice(3)) <= 59
}

// Update an existing entry (full replace of editable fields).
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const { id } = await ctx.params

  let body: { entry?: UpsertEntryInput }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const e = body.entry
  if (!e) {
    return NextResponse.json<ApiError>({ error: 'entry is required' }, { status: 400 })
  }
  if (!e.courseCode?.trim()) {
    return NextResponse.json<ApiError>({ error: 'courseCode is required' }, { status: 400 })
  }
  if (!e.dayOfWeek || !VALID_DAYS.has(e.dayOfWeek)) {
    return NextResponse.json<ApiError>({ error: 'Invalid dayOfWeek' }, { status: 400 })
  }
  if (!validateTime(e.startTime) || !validateTime(e.endTime)) {
    return NextResponse.json<ApiError>({ error: 'startTime/endTime must be HH:MM' }, { status: 400 })
  }

  const existing = await db.scheduleEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Entry not found' }, { status: 404 })
  }

  const updated = await db.scheduleEntry.update({
    where: { id },
    data: {
      courseCode: e.courseCode.trim(),
      courseName: e.courseName?.trim() || null,
      room: e.room?.trim() || null,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      color: e.color || null,
      notes: e.notes?.trim() || null,
      // Clearing the linked calendar event id marks the entry as needing re-sync.
      calendarEventId: null,
    },
  })

  const dto: ScheduleEntryDTO = {
    id: updated.id,
    uploadId: updated.uploadId,
    courseCode: updated.courseCode,
    courseName: updated.courseName,
    room: updated.room,
    dayOfWeek: updated.dayOfWeek,
    startTime: updated.startTime,
    endTime: updated.endTime,
    color: updated.color,
    notes: updated.notes,
    calendarEventId: updated.calendarEventId,
  }
  return NextResponse.json<ScheduleEntryDTO>(dto)
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const { id } = await ctx.params
  const existing = await db.scheduleEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Entry not found' }, { status: 404 })
  }
  await db.scheduleEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
