import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { uploadToDTO } from '@/app/api/upload/route'
import type { ApiError, ScheduleUploadDTO } from '@/lib/types'

export async function GET(
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
  const upload = await db.scheduleUpload.findUnique({
    where: { id },
    include: { entries: { orderBy: { dayOfWeek: 'asc' } }, logs: { orderBy: { syncedAt: 'desc' } } },
  })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Schedule not found' }, { status: 404 })
  }
  return NextResponse.json<ScheduleUploadDTO>(uploadToDTO(upload))
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
  const upload = await db.scheduleUpload.findUnique({ where: { id } })
  if (!upload || upload.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: 'Schedule not found' }, { status: 404 })
  }

  // Cascade delete in DB (entries + logs) plus remove the local image + ICS file.
  const imagePath = path.join(process.cwd(), 'public', upload.imageUrl.replace(/^\/+/, ''))
  const icsPath = path.join(process.cwd(), 'public', 'uploads', 'ics', `${upload.id}.ics`)
  try { fs.unlinkSync(imagePath) } catch { /* ignore */ }
  try { fs.unlinkSync(icsPath) } catch { /* ignore */ }

  await db.scheduleUpload.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
