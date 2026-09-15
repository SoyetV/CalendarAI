import ZAI from 'z-ai-web-dev-sdk'
import fs from 'node:fs'
import path from 'node:path'

export interface ExtractedEntry {
  courseCode: string
  courseName: string | null
  room: string | null
  dayOfWeek: string // MO | TU | WE | TH | FR | SA | SU
  startTime: string // HH:MM (24h)
  endTime: string // HH:MM (24h)
  color: string | null
  notes: string | null
}

export interface ExtractionResult {
  entries: ExtractedEntry[]
  raw: string
}

const VALID_DAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])

const PROMPT = `You are an expert at reading class/work schedule tables from photos and screenshots.

Look at the provided schedule image carefully. Extract every class (or recurring work shift) shown in the table.

For EACH (course, day-of-week) pair, output ONE entry. If a class meets on multiple days (for example "MWF" = Monday+Wednesday+Friday), output a separate entry for each day, all sharing the same course code, room, and times.

Return STRICT JSON only — no markdown fences, no commentary. The JSON shape must be exactly:

{
  "entries": [
    {
      "courseCode": "string (e.g. 'CS101', 'MATH 14', 'ENG 1')",
      "courseName": "string or null (full title if shown, else null)",
      "room": "string or null (e.g. 'Rm 204', 'Bldg A-301')",
      "dayOfWeek": "one of MO | TU | WE | TH | FR | SA | SU",
      "startTime": "HH:MM in 24-hour format (e.g. '09:00', '13:30')",
      "endTime": "HH:MM in 24-hour format",
      "color": "string or null — a CSS hex color like '#ef4444' if the cell is color-coded, else null",
      "notes": "string or null — any extra label like 'Lab', 'Lec', section info, else null"
    }
  ]
}

Rules:
- Convert 12-hour times (e.g. '1:30 PM') to 24-hour ('13:30').
- If a day is shown as an abbreviation (M, T, W, Th, F, S, Su), map to MO/TU/WE/TH/FR/SA/SU respectively. 'Th' is Thursday, 'T' alone is Tuesday.
- If the image has no table or no schedule, return { "entries": [] }.
- Do NOT invent data that is not visible. Use null for missing optional fields.
- Output ONLY the JSON object.`

function extractJson(content: string): unknown {
  // The model is told to return strict JSON, but be defensive: strip markdown
  // fences if present and grab the outermost { ... } block.
  let text = content.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  if (!text.startsWith('{')) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1)
    }
  }
  return JSON.parse(text)
}

function normalizeTime(t: string): string | null {
  if (!t) return null
  const s = t.trim().toUpperCase()
  // 12-hour format: 9:30 AM, 1:00 PM
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
  if (m12) {
    let h = parseInt(m12[1], 10)
    const min = m12[2]
    const ap = m12[3]
    if (ap === 'AM' && h === 12) h = 0
    if (ap === 'PM' && h !== 12) h += 12
    return `${String(h).padStart(2, '0')}:${min}`
  }
  // 24-hour format: 09:30, 13:00
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (m24) {
    const h = parseInt(m24[1], 10)
    const min = m24[2]
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:${min}`
  }
  return null
}

function normalizeEntry(raw: Partial<ExtractedEntry>): ExtractedEntry | null {
  const day = (raw.dayOfWeek || '').trim().toUpperCase()
  if (!VALID_DAYS.has(day)) return null
  const start = normalizeTime(raw.startTime || '')
  const end = normalizeTime(raw.endTime || '')
  if (!start || !end) return null
  const courseCode = (raw.courseCode || '').trim()
  if (!courseCode) return null
  return {
    courseCode,
    courseName: raw.courseName ? String(raw.courseName).trim() : null,
    room: raw.room ? String(raw.room).trim() : null,
    dayOfWeek: day,
    startTime: start,
    endTime: end,
    color: raw.color ? String(raw.color).trim() : null,
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

export async function extractScheduleFromImage(
  imagePath: string,
): Promise<ExtractionResult> {
  // `imagePath` is a web path like "/uploads/abc.png". Resolve it under /public.
  const rel = imagePath.replace(/^\/+/, '')
  const abs = path.join(process.cwd(), 'public', rel)
  const buffer = fs.readFileSync(abs)
  const ext = path.extname(abs).toLowerCase()
  const mimeType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    ext === '.gif' ? 'image/gif' :
    'image/jpeg'
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const zai = await ZAI.create()
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = response.choices?.[0]?.message?.content ?? ''
  let parsed: { entries?: Partial<ExtractedEntry>[] } = { entries: [] }
  try {
    parsed = extractJson(content) as { entries?: Partial<ExtractedEntry>[] }
  } catch {
    parsed = { entries: [] }
  }
  const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : []
  const entries: ExtractedEntry[] = []
  for (const r of rawEntries) {
    const e = normalizeEntry(r)
    if (e) entries.push(e)
  }
  return { entries, raw: content }
}
