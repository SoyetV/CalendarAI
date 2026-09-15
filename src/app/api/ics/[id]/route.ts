import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { buildIcs } from '@/lib/ics'
import type { ApiError } from '@/lib/types'

// Download the ICS for an upload. If the upload was already synced, serve the
// persisted file. If not yet synced but entries exist, build it on the fly from
// the current entries + the upload's stored untilDate (handy for previewing
// without marking the schedule as synced).
export async function GET(
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
  const upload = await db.scheduleUpload.findUnique({
    where: { id },
    include: { entries: true },
  })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Schedule not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const untilOverride = url.searchParams.get('until')
  const untilDate = untilOverride ?? upload.untilDate
  if (!untilDate) {
    return NextResponse.json<ApiError>(
      { error: 'No end date set. Sync the schedule first or pass ?until=YYYY-MM-DD.' },
      { status: 400 },
    )
  }

  // Prefer the persisted file if it exists AND no override was requested.
  if (!untilOverride) {
    const icsPath = path.join(process.cwd(), 'public', 'uploads', 'ics', `${upload.id}.ics`)
    if (fs.existsSync(icsPath)) {
      const data = fs.readFileSync(icsPath, 'utf8')
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="schedule-${upload.id}.ics"`,
          'Cache-Control': 'no-store',
        },
      })
    }
  }

  if (upload.entries.length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'No entries to export.' },
      { status: 400 },
    )
  }

  const { ics } = buildIcs({
    uploadId: upload.id,
    entries: upload.entries,
    untilDate,
    timezone: upload.timezone || 'Asia/Shanghai',
  })
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedule-${upload.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
