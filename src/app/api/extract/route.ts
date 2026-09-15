import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { extractScheduleFromImage } from '@/lib/vlm'
import type { ApiError, ExtractResponse, ScheduleEntryDTO } from '@/lib/types'

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { uploadId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const uploadId = body.uploadId
  if (!uploadId) {
    return NextResponse.json<ApiError>({ error: 'uploadId is required' }, { status: 400 })
  }

  const upload = await db.scheduleUpload.findUnique({ where: { id: uploadId } })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Upload not found' }, { status: 404 })
  }

  try {
    // Run the vision model against the uploaded image.
    const result = await extractScheduleFromImage(upload.imageUrl)

    // Replace any previously extracted entries (re-extraction is idempotent).
    await db.scheduleEntry.deleteMany({ where: { uploadId } })
    const created = await db.$transaction(
      result.entries.map((e) =>
        db.scheduleEntry.create({
          data: {
            uploadId,
            userId: user.id,
            courseCode: e.courseCode,
            courseName: e.courseName,
            room: e.room,
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            color: e.color,
            notes: e.notes,
          },
        }),
      ),
    )

    await db.scheduleUpload.update({
      where: { id: uploadId },
      data: { status: created.length > 0 ? 'parsed' : 'error' },
    })

    const entries: ScheduleEntryDTO[] = created.map((e) => ({
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
    }))

    return NextResponse.json<ExtractResponse>({
      uploadId,
      entries,
      rawExtraction: result.raw,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await db.scheduleUpload.update({
      where: { id: uploadId },
      data: { status: 'error' },
    })
    return NextResponse.json<ApiError>(
      { error: 'Extraction failed', detail: message },
      { status: 500 },
    )
  }
}
