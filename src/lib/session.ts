import { cookies } from 'next/headers'
import { db } from './db'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

const SESSION_COOKIE = 'calauto_session'
// A single demo user is created on first sign-in so the UX matches a real
// "Sign in with Google" flow without requiring real OAuth credentials.
const DEMO_USER = {
  email: 'you@example.com',
  name: 'Demo User',
  avatarUrl: null,
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SessionUser
    if (!parsed?.id || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export async function createSession(): Promise<SessionUser> {
  // Reuse an existing demo user if one exists, otherwise create one.
  let user = await db.user.findUnique({ where: { email: DEMO_USER.email } })
  if (!user) {
    user = await db.user.create({
      data: {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        avatarUrl: DEMO_USER.avatarUrl,
        provider: 'google',
      },
    })
  }
  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  }
  const store = await cookies()
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return session
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}
