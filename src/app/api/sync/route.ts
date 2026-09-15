import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { buildIcs } from '@/lib/ics'
import fs from 'node:fs'
import path from 'node:path'
import type { ApiError, SyncResponse } from '@/lib/types'

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { uploadId?: string; untilDate?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { uploadId, untilDate } = body
  if (!uploadId) {
    return NextResponse.json<ApiError>({ error: 'uploadId is required' }, { status: 400 })
  }
  if (!untilDate || !isValidDate(untilDate)) {
    return NextResponse.json<ApiError>(
      { error: 'untilDate is required and must be YYYY-MM-DD' },
      { status: 400 },
    )
  }

  const upload = await db.scheduleUpload.findUnique({
    where: { id: uploadId },
    include: { entries: true },
  })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Upload not found' }, { status: 404 })
  }
  if (upload.entries.length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'No schedule entries to sync. Extract or add entries first.' },
      { status: 400 },
    )
  }

  try {
    const { ics, eventUids } = buildIcs({
      uploadId: upload.id,
      entries: upload.entries,
      untilDate,
      timezone: upload.timezone || 'Asia/Shanghai',
    })

    // Persist the ICS file so it can be re-downloaded later from /api/ics/[id].
    const icsDir = path.join(process.cwd(), 'public', 'uploads', 'ics')
    fs.mkdirSync(icsDir, { recursive: true })
    const icsFilename = `${upload.id}.ics`
    fs.writeFileSync(path.join(icsDir, icsFilename), ics, 'utf8')

    // Stamp every entry with its calendar event UID (the ICS VEVENT UID) so a
    // future delete/re-sync can target it.
    await db.$transaction(
      upload.entries.map((e) =>
        db.scheduleEntry.update({
          where: { id: e.id },
          data: { calendarEventId: eventUids[e.id] ?? null },
        }),
      ),
    )

    await db.scheduleUpload.update({
      where: { id: upload.id },
      data: { status: 'synced', untilDate },
    })

    const log = await db.syncLog.create({
      data: {
        uploadId: upload.id,
        userId: user.id,
        untilDate,
        result: 'success',
        entriesCount: upload.entries.length,
      },
    })

    const res: SyncResponse = {
      uploadId: upload.id,
      status: 'synced',
      untilDate,
      entriesCount: upload.entries.length,
      icsUrl: `/uploads/ics/${icsFilename}`,
      downloadUrl: `/api/ics/${upload.id}`,
    }
    void log
    return NextResponse.json<SyncResponse>(res)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await db.syncLog.create({
      data: {
        uploadId: upload.id,
        userId: user.id,
        untilDate,
        result: 'error',
        errorMessage: message,
        entriesCount: 0,
      },
    })
    await db.scheduleUpload.update({
      where: { id: upload.id },
      data: { status: 'error' },
    })
    return NextResponse.json<ApiError>(
      { error: 'Sync failed', detail: message },
      { status: 500 },
    )
  }
}
