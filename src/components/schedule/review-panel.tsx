'use client'

import { useCallback, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { COLOR_PALETTE, DAY_OPTIONS, DAY_LABELS, type ScheduleEntryDTO, type ScheduleUploadDTO, type UpsertEntryInput } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DraftEntry extends UpsertEntryInput {
  id?: string
  _dirty?: boolean
  _saving?: boolean
}

function toDraft(e: ScheduleEntryDTO): DraftEntry {
  return {
    id: e.id,
    courseCode: e.courseCode,
    courseName: e.courseName,
    room: e.room,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    color: e.color,
    notes: e.notes,
  }
}

export function ReviewPanel({
  upload,
  onContinue,
  onBack,
  onEntriesChanged,
}: {
  upload: ScheduleUploadDTO
  onContinue: () => void
  onBack: () => void
  onEntriesChanged: (entries: ScheduleEntryDTO[]) => void
}) {
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<DraftEntry[]>(() => upload.entries.map(toDraft))
  const [adding, setAdding] = useState(false)

  const sorted = useMemo(() => {
    const order: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }
    return [...drafts].sort((a, b) => {
      const d = (order[a.dayOfWeek] ?? 9) - (order[b.dayOfWeek] ?? 9)
      if (d !== 0) return d
      return a.startTime.localeCompare(b.startTime)
    })
  }, [drafts])

  const updateDraft = useCallback((id: string | undefined, patch: Partial<DraftEntry>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch, _dirty: true } : d)))
  }, [])

  const saveDraft = useCallback(
    async (draft: DraftEntry) => {
      if (!draft.id) return
      setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, _saving: true } : d)))
      try {
        const updated = await api.updateEntry(draft.id, draft)
        setDrafts((prev) =>
          prev.map((d) => (d.id === updated.id ? { ...toDraft(updated), _dirty: false, _saving: false } : d)),
        )
        onEntriesChanged(drafts.filter((d) => d.id).map((d) => d as unknown as ScheduleEntryDTO))
      } catch (e) {
        toast({
          title: 'Could not save entry',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
        setDrafts((prev) => prev.map((d) => (d.id === draft.id ? { ...d, _saving: false } : d)))
      }
    },
    [drafts, onEntriesChanged, toast],
  )

  const handleDelete = useCallback(
    async (id?: string) => {
      if (!id) return
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      try {
        await api.deleteEntry(id)
        onEntriesChanged(drafts.filter((d) => d.id !== id).map((d) => d as unknown as ScheduleEntryDTO))
        toast({ title: 'Entry removed' })
      } catch (e) {
        toast({
          title: 'Could not delete entry',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      }
    },
    [drafts, onEntriesChanged, toast],
  )

  const handleAdd = useCallback(async () => {
    setAdding(true)
    const newDraft: DraftEntry = {
      courseCode: 'NEW100',
      courseName: null,
      room: null,
      dayOfWeek: 'MO',
      startTime: '09:00',
      endTime: '10:00',
      color: COLOR_PALETTE[drafts.length % COLOR_PALETTE.length],
      notes: null,
    }
    try {
      const created = await api.addEntry(upload.id, newDraft)
      setDrafts((prev) => [...prev, toDraft(created)])
      onEntriesChanged([...drafts, created].filter((d): d is ScheduleEntryDTO => 'uploadId' in d))
      toast({ title: 'Row added' })
    } catch (e) {
      toast({
        title: 'Could not add row',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }, [drafts, onEntriesChanged, toast, upload.id])

  const hasInvalid = drafts.some((d) => !d.courseCode.trim() || !d.startTime || !d.endTime)
  const allSaved = drafts.every((d) => !d._dirty && !d._saving)

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Review your schedule</h2>
            <p className="text-sm text-muted-foreground">
              AI extraction isn&apos;t perfect — fix anything that looks wrong, add missing rows,
              or remove extras. Changes save automatically when you leave a field.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add row
          </Button>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No entries detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI didn&apos;t find a schedule table in this image. You can add rows manually,
              or go back and try a clearer image.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleAdd} disabled={adding}>
              <Plus className="mr-2 h-4 w-4" /> Add a row manually
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[1.4fr_1.6fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr_2rem] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
              <span>Course</span>
              <span>Title</span>
              <span>Room</span>
              <span>Day</span>
              <span>Start</span>
              <span>End</span>
              <span>Color</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {sorted.map((d) => (
                <EntryRow
                  key={d.id ?? 'new'}
                  draft={d}
                  onChange={(patch) => updateDraft(d.id, patch)}
                  onBlur={() => d._dirty && saveDraft(d)}
                  onDelete={() => handleDelete(d.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={onBack}>
            ← Back to upload
          </Button>
          <div className="flex items-center gap-3">
            {!allSaved && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving changes…
              </span>
            )}
            {hasInvalid && (
              <span className="text-xs text-destructive">Fix empty course/time fields to continue</span>
            )}
            <Button onClick={onContinue} disabled={hasInvalid || !allSaved || drafts.length === 0}>
              Continue to sync <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EntryRow({
  draft,
  onChange,
  onBlur,
  onDelete,
}: {
  draft: DraftEntry
  onChange: (patch: Partial<DraftEntry>) => void
  onBlur: () => void
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1.6fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr_2rem] gap-2 px-3 py-3 items-center bg-background">
      <Field label="Course">
        <Input
          value={draft.courseCode}
          onChange={(e) => onChange({ courseCode: e.target.value })}
          onBlur={onBlur}
          placeholder="CS101"
          className="h-9"
        />
      </Field>
      <Field label="Title">
        <Input
          value={draft.courseName ?? ''}
          onChange={(e) => onChange({ courseName: e.target.value || null })}
          onBlur={onBlur}
          placeholder="Intro to CS"
          className="h-9"
        />
      </Field>
      <Field label="Room">
        <Input
          value={draft.room ?? ''}
          onChange={(e) => onChange({ room: e.target.value || null })}
          onBlur={onBlur}
          placeholder="Rm 204"
          className="h-9"
        />
      </Field>
      <Field label="Day">
        <Select
          value={draft.dayOfWeek}
          onValueChange={(v) => {
            onChange({ dayOfWeek: v })
            // Commit immediately for selects.
            setTimeout(onBlur, 0)
          }}
        >
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Start">
        <Input
          type="time"
          value={draft.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
          onBlur={onBlur}
          className="h-9"
        />
      </Field>
      <Field label="End">
        <Input
          type="time"
          value={draft.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
          onBlur={onBlur}
          className="h-9"
        />
      </Field>
      <Field label="Color">
        <div className="flex items-center gap-1 flex-wrap">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange({ color: c })
                setTimeout(onBlur, 0)
              }}
              className={cn(
                'h-5 w-5 rounded-full border transition-transform',
                draft.color === c ? 'ring-2 ring-offset-1 ring-foreground scale-110 border-background' : 'border-transparent hover:scale-110',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Pick color ${c}`}
            />
          ))}
          {draft.color && (
            <button
              type="button"
              onClick={() => { onChange({ color: null }); setTimeout(onBlur, 0) }}
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
            >
              clear
            </button>
          )}
        </div>
      </Field>
      <div className="flex lg:justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {draft._saving && (
        <div className="col-span-full -mt-1">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> saving…
          </Badge>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 lg:gap-1.5">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide lg:hidden">
        {label}
      </span>
      {children}
    </label>
  )
}

export { DAY_LABELS }
