'use client'

import { CalendarSync, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { SessionDTO } from '@/lib/types'

export function AppHeader({
  user,
  onSignOut,
}: {
  user: SessionDTO
  onSignOut: () => void
}) {
  const initials = (user.name || user.email)
    .split(/[ @]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarSync className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold">Calendar Automation</span>
            <span className="text-[10px] text-muted-foreground">image → schedule → calendar</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
