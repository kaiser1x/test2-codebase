import { beforeEach, describe, expect, it } from 'vitest'
import {
  authenticate,
  createSession,
  createUser,
  destroySession,
  getSession,
  refreshSession,
  resetState,
  setSessionsNow,
} from '../src/index'

beforeEach(() => {
  resetState()
})

describe('sessions', () => {
  it('creates a session for an existing user', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const session = createSession(user.id)

    expect(session.token).toBeTruthy()
    expect(session.userId).toBe(user.id)
    expect(session.expiresAt).toBeGreaterThan(session.createdAt)
    expect(getSession(session.token)?.userId).toBe(user.id)
  })

  it('rejects sessions for unknown users', () => {
    expect(() => createSession('no-such-user')).toThrow(/Unknown user/)
  })

  it('authenticates a token to its user', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const session = createSession(user.id)

    expect(authenticate(session.token)?.id).toBe(user.id)
    expect(authenticate('bogus-token')).toBeNull()
  })

  it('destroys sessions', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const session = createSession(user.id)

    destroySession(session.token)

    expect(getSession(session.token)).toBeNull()
    expect(authenticate(session.token)).toBeNull()
  })

  it('keeps sessions valid within their TTL', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const fixedNow = 1_700_000_000_000
    setSessionsNow(() => fixedNow)

    const session = createSession(user.id)
    setSessionsNow(() => fixedNow + 30 * 60 * 1000)

    expect(getSession(session.token)?.userId).toBe(user.id)
  })

  it('expires sessions after their TTL', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const fixedNow = 1_700_000_000_000
    setSessionsNow(() => fixedNow)

    const session = createSession(user.id)
    setSessionsNow(() => fixedNow + 61 * 60 * 1000)

    expect(getSession(session.token)).toBeNull()
    expect(authenticate(session.token)).toBeNull()
  })

  it('does not refresh an expired session', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const fixedNow = 1_700_000_000_000
    setSessionsNow(() => fixedNow)

    const session = createSession(user.id)
    setSessionsNow(() => fixedNow + 61 * 60 * 1000)

    expect(() => refreshSession(session.token)).toThrow(/Unknown session/)
    expect(getSession(session.token)).toBeNull()
  })
})