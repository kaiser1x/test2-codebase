import { randomBytes } from 'node:crypto'
import { getUserById } from './users'
import type { PublicUser } from './users'

export interface Session {
  token: string
  userId: string
  createdAt: number
  expiresAt: number
}

interface SessionsStore {
  sessions: Map<string, Session>
  now: () => number
}

const SESSION_TTL_MS = 60 * 60 * 1000

const store: SessionsStore = {
  sessions: new Map(),
  now: () => Date.now(),
}

export function setSessionsNow(now: () => number): void {
  store.now = now
}

export function resetSessions(): void {
  store.sessions.clear()
  store.now = () => Date.now()
}

export function createSession(userId: string): Session {
  const user = getUserById(userId)
  if (!user) throw new Error(`Unknown user: ${userId}`)

  const token = randomBytes(32).toString('hex')
  const now = store.now()
  const session: Session = {
    token,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  }
  store.sessions.set(token, session)
  return session
}

export function getSession(token: string): Session | null {
  const session = store.sessions.get(token)
  if (!session) return null
  if (store.now() > session.expiresAt) {
    store.sessions.delete(token)
    return null
  }
  return session
}

export function destroySession(token: string): void {
  store.sessions.delete(token)
}

export function authenticate(token: string): PublicUser | null {
  const session = getSession(token)
  if (!session) return null
  return getUserById(session.userId)
}