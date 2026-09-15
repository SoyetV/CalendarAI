'use client'

import { Github, Heart } from 'lucide-react'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Calendar Automation</span>
          <span className="text-muted-foreground/60">·</span>
          <span>AI vision + ICS RRULE recurring events</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> using Next.js &amp; Prisma
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Github className="h-3.5 w-3.5" /> Open spec
          </span>
        </div>
      </div>
    </footer>
  )
}
