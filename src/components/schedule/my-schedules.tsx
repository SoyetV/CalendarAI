'use client'

import { useState } from 'react'
import { CalendarSync, Clock, Download, ImageIcon, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api'
import { DAY_LABELS, type ScheduleUploadDTO } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  parsed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  synced: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function MySchedules({
  schedules,
  loading,
  onOpen,
  onDeleted,
  onNew,
}: {
  schedules: ScheduleUploadDTO[]
  loading: boolean
  onOpen: (s: ScheduleUploadDTO) => void
  onDeleted: (id: string) => void
  onNew: () => void
}) {
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.deleteSchedule(id)
      onDeleted(id)
      toast({ title: 'Schedule deleted' })
    } catch (e) {
      toast({
        title: 'Could not delete schedule',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">My schedules</h2>
          <p className="text-sm text-muted-foreground">
            Your previously uploaded schedules. Re-open to edit, re-download the .ics, or delete.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onNew}>
          <CalendarSync className="mr-2 h-4 w-4" /> New schedule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your schedules…
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No schedules yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a schedule image above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <Card key={s.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] bg-muted/30 border-b border-border">
                <img
                  src={s.imageUrl}
                  alt={s.imageName || 'Schedule image'}
                  className="h-full w-full object-cover"
                />
                <Badge
                  className={cn(
                    'absolute top-2 right-2 capitalize text-[10px]',
                    STATUS_STYLES[s.status] ?? STATUS_STYLES.pending,
                  )}
                >
                  {s.status}
                </Badge>
              </div>
              <CardContent className="p-4 flex flex-col gap-3 flex-1">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {new Date(s.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-foreground">
                    <span className="font-semibold">{s.entries.length}</span> entries
                    {s.untilDate && (
                      <span className="text-muted-foreground"> · until {s.untilDate}</span>
                    )}
                  </p>
                  {s.entries.length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {Array.from(new Set(s.entries.map((e) => e.courseCode))).slice(0, 4).join(', ')}
                      {new Set(s.entries.map((e) => e.courseCode)).size > 4 && '…'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpen(s)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Open
                  </Button>
                  {s.status === 'synced' && (
                    <Button size="sm" variant="ghost" asChild title="Download .ics">
                      <a href={api.icsDownloadUrl(s.id)} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingId === s.id}
                        title="Delete"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the schedule, its {s.entries.length} entries,
                          and the downloaded .ics file. Calendar events already imported into your
                          calendar will not be removed (delete those from Google Calendar directly).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(s.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

export { DAY_LABELS }
