'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, Download, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { DAY_OPTIONS, DAY_LABELS, type ScheduleEntryDTO, type ScheduleUploadDTO, type SyncResponse } from '@/lib/types'
import { buildPreviewWeeks, countOccurrences, defaultUntilDate } from '@/lib/preview'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function SyncPanel({
  upload,
  onBack,
  onDone,
  onResync,
}: {
  upload: ScheduleUploadDTO
  onBack: () => void
  onDone: () => void
  onResync: () => void
}) {
  const { toast } = useToast()
  const [untilDate, setUntilDate] = useState<string>(upload.untilDate ?? defaultUntilDate())
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResponse | null>(null)

  const entries = upload.entries
  const today = useMemo(() => new Date(), [])
  const weeks = useMemo(() => buildPreviewWeeks(entries, today, 3).flat(), [entries, today])
  const totalOccurrences = useMemo(
    () => entries.reduce((sum, e) => sum + countOccurrences(e, today, untilDate), 0),
    [entries, today, untilDate],
  )

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await api.sync(upload.id, untilDate)
      setResult(res)
      // Auto-download the ICS file.
      window.open(api.icsDownloadUrl(upload.id), '_blank')
      toast({
        title: 'Calendar events generated!',
        description: `${res.entriesCount} entries → recurring .ics file downloaded.`,
      })
    } catch (e) {
      toast({
        title: 'Sync failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold">You&apos;re all set!</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {result.entriesCount} recurring calendar events have been generated and downloaded
              as a <code className="text-foreground">.ics</code> file. Import it into Google Calendar,
              Outlook, or Apple Calendar to see your full term schedule.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="Events generated" value={String(result.entriesCount)} />
            <Stat label="Repeat until" value={result.untilDate} />
            <Stat label="Approx. occurrences" value={String(totalOccurrences)} />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">How to import into Google Calendar</p>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5">
                  <li>Open <a className="text-primary underline" href="https://calendar.google.com" target="_blank" rel="noreferrer">Google Calendar</a> on desktop.</li>
                  <li>Click the <strong>+</strong> next to “Other calendars” → <strong>Import</strong>.</li>
                  <li>Select the downloaded <code>.ics</code> file and choose your calendar.</li>
                  <li>Click <strong>Import</strong> — your recurring classes will appear.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Button variant="ghost" onClick={onResync}>
              <RefreshCw className="mr-2 h-4 w-4" /> Start a new schedule
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href={api.icsDownloadUrl(upload.id)} download>
                  <Download className="mr-2 h-4 w-4" /> Download .ics again
                </a>
              </Button>
              <Button onClick={onDone}>
                View my schedules
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Sync to your calendar</h2>
          <p className="text-sm text-muted-foreground">
            Pick the date your term ends. We&apos;ll create one weekly recurring event per class
            slot, repeating until that date.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="until">Repeat until (end of term)</Label>
            <Input
              id="until"
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              All times are treated as Asia/Shanghai.
            </p>
          </div>
          <div className="flex flex-col justify-end">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entries to sync</span>
                <span className="font-semibold">{entries.length}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted-foreground">Approx. total occurrences</span>
                <span className="font-semibold">{totalOccurrences}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly preview grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Preview — first 3 weeks</h3>
            <Badge variant="secondary" className="text-xs">Asia/Shanghai</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weeks.map((week, wi) => (
              <div key={wi} className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                  Week of {week.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </div>
                <div className="divide-y divide-border">
                  {week.days.map((day) => (
                    <div key={day.dayOfWeek} className="px-3 py-2 min-h-[3rem]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {DAY_LABELS[day.dayOfWeek]}{' '}
                          <span className="text-muted-foreground/70">
                            {day.date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', timeZone: 'UTC' })}
                          </span>
                        </span>
                      </div>
                      {day.entries.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/50">—</p>
                      ) : (
                        <div className="space-y-1">
                          {day.entries.map((e) => (
                            <EntryPill key={e.id} entry={e} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={onBack}>
            ← Back to review
          </Button>
          <Button onClick={handleSync} disabled={syncing || entries.length === 0 || !untilDate} size="lg">
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
            {syncing ? 'Generating calendar events…' : `Generate ${entries.length} recurring event${entries.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EntryPill({ entry }: { entry: ScheduleEntryDTO }) {
  const color = entry.color || '#64748b'
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-1.5 py-1">
      <span
        className={cn('h-2.5 w-2.5 rounded-full shrink-0')}
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-semibold truncate">{entry.courseCode}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {entry.startTime}–{entry.endTime}
          </span>
        </div>
        {entry.room && (
          <p className="text-[10px] text-muted-foreground truncate">{entry.room}</p>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  )
}

export { DAY_OPTIONS }
