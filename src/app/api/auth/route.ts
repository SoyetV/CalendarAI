import { NextResponse } from 'next/server'
import { createSession, destroySession, getSession } from '@/lib/session'
import type { SessionDTO } from '@/lib/types'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json<SessionDTO | null>(null)
  return NextResponse.json<SessionDTO>(user)
}

export async function POST() {
  // Mock "Continue with Google" — creates a local demo user + session cookie.
  const session = await createSession()
  return NextResponse.json<SessionDTO>(session)
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
