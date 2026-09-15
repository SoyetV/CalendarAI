import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { uploadToDTO } from '@/app/api/upload/route'
import type { ApiError, ScheduleUploadDTO } from '@/lib/types'

export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json<ApiError>({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const uploads = await db.scheduleUpload.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { entries: { orderBy: { dayOfWeek: 'asc' } }, logs: { orderBy: { syncedAt: 'desc' } } },
  })
  return NextResponse.json<ScheduleUploadDTO[]>(uploads.map(uploadToDTO))
}
