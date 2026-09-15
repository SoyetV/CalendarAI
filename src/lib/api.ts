import type {
  ScheduleEntryDTO,
  ScheduleUploadDTO,
  SessionDTO,
  SyncResponse,
  UpsertEntryInput,
} from './types'

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body?.error || body?.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  async getSession(): Promise<SessionDTO | null> {
    const res = await fetch('/api/auth', { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  },
  async signIn(): Promise<SessionDTO> {
    const res = await fetch('/api/auth', { method: 'POST' })
    return asJson<SessionDTO>(res)
  },
  async signOut(): Promise<void> {
    await fetch('/api/auth', { method: 'DELETE' })
  },

  async uploadImage(file: File): Promise<ScheduleUploadDTO> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    return asJson<ScheduleUploadDTO>(res)
  },
  async extract(uploadId: string): Promise<{ entries: ScheduleEntryDTO[]; rawExtraction: string }> {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    })
    return asJson(res)
  },
  async listSchedules(): Promise<ScheduleUploadDTO[]> {
    const res = await fetch('/api/schedules', { cache: 'no-store' })
    return asJson<ScheduleUploadDTO[]>(res)
  },
  async getSchedule(id: string): Promise<ScheduleUploadDTO> {
    const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, { cache: 'no-store' })
    return asJson<ScheduleUploadDTO>(res)
  },
  async deleteSchedule(id: string): Promise<void> {
    const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await asJson(res)
  },
  async addEntry(uploadId: string, entry: UpsertEntryInput): Promise<ScheduleEntryDTO> {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, entry }),
    })
    return asJson<ScheduleEntryDTO>(res)
  },
  async updateEntry(id: string, entry: UpsertEntryInput): Promise<ScheduleEntryDTO> {
    const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
    })
    return asJson<ScheduleEntryDTO>(res)
  },
  async deleteEntry(id: string): Promise<void> {
    const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await asJson(res)
  },
  async sync(uploadId: string, untilDate: string): Promise<SyncResponse> {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, untilDate }),
    })
    return asJson<SyncResponse>(res)
  },
  icsDownloadUrl(id: string, until?: string): string {
    const q = until ? `?until=${encodeURIComponent(until)}` : ''
    return `/api/ics/${encodeURIComponent(id)}${q}`
  },
}
