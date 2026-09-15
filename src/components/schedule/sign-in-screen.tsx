'use client'

import { CalendarSync, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { SessionDTO } from '@/lib/types'

export function SignInScreen({ onSignedIn }: { onSignedIn: (u: SessionDTO) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      const user = await api.signIn()
      onSignedIn(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarSync className="h-3.5 w-3.5" />
            Image in. Calendar events out.
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Turn a schedule photo into recurring calendar events.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Upload a picture of your class or work term schedule. Our AI reads the
            table, you review and tweak it, pick an end date, and we generate
            weekly recurring events you can import into Google Calendar, Outlook,
            or iCal — all in under a minute.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              AI vision extracts course, room, days, and times.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              Editable review screen — you confirm before anything is created.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              Standard <code className="text-foreground">.ics</code> with{' '}
              <code className="text-foreground">RRULE</code> — universal calendar import.
            </li>
          </ul>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold">Get started</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to save your schedules and re-download them anytime.
              </p>
            </div>
            <Button
              onClick={handleSignIn}
              disabled={loading}
              size="lg"
              className="w-full h-12 text-base"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              {loading ? 'Signing you in…' : 'Continue with Google'}
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              This demo uses a local session — no real Google credentials are
              required. Calendar events are produced as a downloadable{' '}
              <code>.ics</code> file that imports directly into Google Calendar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
