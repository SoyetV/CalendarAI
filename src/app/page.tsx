'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarSync } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignInScreen } from '@/components/schedule/sign-in-screen'
import { AppHeader } from '@/components/schedule/app-header'
import { AppFooter } from '@/components/schedule/app-footer'
import { Stepper, type StepperStep } from '@/components/schedule/stepper'
import { UploadPanel } from '@/components/schedule/upload-panel'
import { ReviewPanel } from '@/components/schedule/review-panel'
import { SyncPanel } from '@/components/schedule/sync-panel'
import { MySchedules } from '@/components/schedule/my-schedules'
import { api } from '@/lib/api'
import type { ScheduleEntryDTO, ScheduleUploadDTO, SessionDTO } from '@/lib/types'

const STEPS: StepperStep[] = [
  { id: 1, label: 'Upload', description: 'Schedule image' },
  { id: 2, label: 'Review', description: 'Edit entries' },
  { id: 3, label: 'Sync', description: 'Generate events' },
]

type Step = 1 | 2 | 3

export default function Home() {
  const [user, setUser] = useState<SessionDTO | null | undefined>(undefined)
  const [schedules, setSchedules] = useState<ScheduleUploadDTO[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [activeUpload, setActiveUpload] = useState<ScheduleUploadDTO | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [maxReached, setMaxReached] = useState<Step>(1)

  // Restore session on mount.
  useEffect(() => {
    let cancelled = false
    api.getSession().then((u) => {
      if (!cancelled) setUser(u)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    try {
      const list = await api.listSchedules()
      setSchedules(list)
    } catch {
      setSchedules([])
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) loadSchedules()
  }, [user, loadSchedules])

  function handleSignedIn(u: SessionDTO) {
    setUser(u)
  }

  async function handleSignOut() {
    await api.signOut()
    setUser(null)
    setActiveUpload(null)
    setStep(1)
    setMaxReached(1)
    setSchedules([])
  }

  function startNew() {
    setActiveUpload(null)
    setStep(1)
    setMaxReached(1)
  }

  function handleUploaded(upload: ScheduleUploadDTO) {
    setActiveUpload(upload)
    setStep(2)
    setMaxReached(2)
  }

  function handleEntriesChanged(entries: ScheduleEntryDTO[]) {
    if (!activeUpload) return
    setActiveUpload({ ...activeUpload, entries })
  }

  function goToStep(s: Step) {
    if (s > maxReached) return
    setStep(s)
  }

  function openSchedule(s: ScheduleUploadDTO) {
    setActiveUpload(s)
    // Open synced schedules at the sync step (so they can re-download / re-sync),
    // otherwise at the review step.
    const startStep: Step = s.status === 'synced' ? 3 : 2
    setStep(startStep)
    setMaxReached(startStep)
    // Scroll to top so the stepper is visible.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (user === undefined) {
    // Initial session check.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="h-14 border-b border-border" />
        <SignInScreen onSignedIn={handleSignedIn} />
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader user={user} onSignOut={handleSignOut} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 space-y-8">
        {activeUpload ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={startNew} className="self-start">
                <ArrowLeft className="mr-2 h-4 w-4" /> All schedules
              </Button>
              <div className="flex-1 max-w-xl sm:mx-4">
                <Stepper
                  steps={STEPS}
                  current={step}
                  maxReached={maxReached}
                  onStepClick={(s) => goToStep(s as Step)}
                />
              </div>
              <div className="hidden sm:block w-20" />
            </div>

            {step === 1 && <UploadPanel onUploaded={handleUploaded} />}
            {step === 2 && activeUpload && (
              <ReviewPanel
                upload={activeUpload}
                onBack={startNew}
                onContinue={() => { setStep(3); setMaxReached(3) }}
                onEntriesChanged={handleEntriesChanged}
              />
            )}
            {step === 3 && activeUpload && (
              <SyncPanel
                upload={activeUpload}
                onBack={() => setStep(2)}
                onDone={() => { startNew(); loadSchedules() }}
                onResync={() => { startNew(); loadSchedules() }}
              />
            )}
          </div>
        ) : (
          <div className="space-y-10">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <CalendarSync className="h-3.5 w-3.5" />
                Step 1 of 3
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Upload a schedule to begin
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Drag in a photo or screenshot of your term schedule. Our AI will read every cell
                and turn it into editable entries you can sync straight to your calendar.
              </p>
            </div>
            <UploadPanel onUploaded={handleUploaded} />
            <MySchedules
              schedules={schedules}
              loading={schedulesLoading}
              onOpen={openSchedule}
              onDeleted={(id) => setSchedules((prev) => prev.filter((s) => s.id !== id))}
              onNew={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  )
}
