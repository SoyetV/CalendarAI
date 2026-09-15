import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import type { ApiError, ScheduleUploadDTO } from '@/lib/types'
import type { ScheduleEntry, SyncLog } from '@prisma/client'

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const MAX_BYTES = 12 * 1024 * 1024 // 12 MB

function toDTO(
  u: {
    id: string
    imageUrl: string
    imageName: string | null
    status: string
    untilDate: string | null
    timezone: string
    createdAt: Date
    entries: ScheduleEntry[]
    logs: SyncLog[]
  },
): ScheduleUploadDTO {
  return {
    id: u.id,
    imageUrl: u.imageUrl,
    imageName: u.imageName,
    status: u.status,
    untilDate: u.untilDate,
    timezone: u.timezone,
    createdAt: u.createdAt.toISOString(),
    entries: u.entries.map((e) => ({
      id: e.id,
      uploadId: e.uploadId,
      courseCode: e.courseCode,
      courseName: e.courseName,
      room: e.room,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      color: e.color,
      notes: e.notes,
      calendarEventId: e.calendarEventId,
    })),
    logs: u.logs.map((l) => ({
      id: l.id,
      syncedAt: l.syncedAt.toISOString(),
      untilDate: l.untilDate,
      result: l.result,
      errorMessage: l.errorMessage,
      entriesCount: l.entriesCount,
    })),
  }
}
export { toDTO as uploadToDTO }

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json<ApiError>({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json<ApiError>(
      { error: 'Unsupported file type. Please upload a PNG, JPG, WebP, or GIF image.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json<ApiError>(
      { error: 'Image is too large. Maximum 12 MB.' },
      { status: 400 },
    )
  }

  const ext = file.name.includes('.') ? path.extname(file.name).toLowerCase() : '.jpg'
  const id = randomUUID()
  const filename = `${id}${ext}`
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  fs.mkdirSync(uploadsDir, { recursive: true })
  const filepath = path.join(uploadsDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filepath, buffer)

  const imageUrl = `/uploads/${filename}`
  const upload = await db.scheduleUpload.create({
    data: {
      userId: user.id,
      imageUrl,
      imageName: file.name || null,
      status: 'pending',
    },
    include: { entries: true, logs: true },
  })

  return NextResponse.json<ScheduleUploadDTO>(toDTO(upload))
}
