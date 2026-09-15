'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { ScheduleUploadDTO } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export function UploadPanel({
  onUploaded,
}: {
  onUploaded: (upload: ScheduleUploadDTO) => void
}) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<'upload' | 'extract' | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const reset = useCallback(() => {
    setPendingFile(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please choose an image file', variant: 'destructive' })
      return
    }
    setPendingFile(file)
    setPreview({ url: URL.createObjectURL(file), name: file.name })
  }, [toast])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  async function handleUploadAndExtract() {
    if (!pendingFile) return
    setBusy('upload')
    try {
      const upload = await api.uploadImage(pendingFile)
      setBusy('extract')
      await api.extract(upload.id)
      // Fetch the upload with entries now populated.
      const fresh = await api.getSchedule(upload.id)
      reset()
      onUploaded(fresh)
      toast({ title: 'Schedule extracted', description: `${fresh.entries.length} entries found.` })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      toast({ title: 'Something went wrong', description: msg, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Upload your schedule</h2>
          <p className="text-sm text-muted-foreground">
            Drop a photo or screenshot of your class/work term table. PNG, JPG, WebP, or GIF up to 12 MB.
          </p>
        </div>

        {!preview ? (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/40'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                <span className="text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                A clear, top-down photo or screenshot works best.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl border border-border overflow-hidden bg-muted/30">
              <button
                type="button"
                onClick={reset}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 border border-border hover:bg-background"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={preview.url}
                alt={preview.name}
                className="mx-auto max-h-[420px] w-auto object-contain"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <ImagePlus className="h-4 w-4 shrink-0" />
                <span className="truncate">{preview.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={reset} disabled={!!busy}>
                  Choose another
                </Button>
                <Button onClick={handleUploadAndExtract} disabled={!!busy}>
                  {busy === 'upload' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {busy === 'extract' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {busy === 'upload'
                    ? 'Uploading…'
                    : busy === 'extract'
                      ? 'Reading schedule with AI…'
                      : 'Extract schedule'}
                </Button>
              </div>
            </div>
            {busy === 'extract' && (
              <p className="text-xs text-muted-foreground">
                This usually takes a few seconds. The AI is reading every cell of your table.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
