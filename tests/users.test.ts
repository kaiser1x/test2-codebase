import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  authenticateUser,
  createUser,
  getUserByEmail,
  getUserById,
  getUserNotifications,
  requestPasswordReset,
  resetPassword,
  resetState,
  setUsersNow,
} from '../src/index'

beforeEach(() => {
  resetState()
})

describe('users', () => {
  it('creates a user and looks them up by id and email', () => {
    const created = createUser({ email: 'bob@example.com', name: 'Bob', password: 's3cret' })
    expect(created.id).toBeTruthy()
    expect(created.email).toBe('bob@example.com')
    expect(created).not.toHaveProperty('passwordHash')

    expect(getUserById(created.id)).toEqual(created)
    expect(getUserByEmail('bob@example.com')).toEqual(created)
  })

  it('normalizes email addresses', () => {
    const user = createUser({ email: '  BOB@EXAMPLE.COM ', name: 'Bob', password: 'x' })
    expect(user.email).toBe('bob@example.com')
  })

  it('rejects duplicate email addresses', () => {
    createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    expect(() =>
      createUser({ email: 'bob@example.com', name: 'Other Bob', password: 'y' }),
    ).toThrow(/already exists/)
  })

  it('rejects invalid emails and empty names', () => {
    expect(() => createUser({ email: 'not-an-email', name: 'Bob', password: 'x' })).toThrow(
      /Invalid email/,
    )
    expect(() => createUser({ email: 'bob@example.com', name: '   ', password: 'x' })).toThrow(
      /Name is required/,
    )
  })

  it('authenticates with the correct password', () => {
    createUser({ email: 'bob@example.com', name: 'Bob', password: 's3cret' })
    expect(authenticateUser('bob@example.com', 's3cret')).not.toBeNull()
    expect(authenticateUser('bob@example.com', 'wrong')).toBeNull()
    expect(authenticateUser('nobody@example.com', 's3cret')).toBeNull()
  })

  it('resets a password and invalidates the old one', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'old-password' })
    const token = requestPasswordReset(user.email)
    resetPassword(token, 'new-password')

    expect(authenticateUser('bob@example.com', 'old-password')).toBeNull()
    expect(authenticateUser('bob@example.com', 'new-password')).not.toBeNull()
  })

  it('rejects an unknown email for password reset', () => {
    expect(() => requestPasswordReset('ghost@example.com')).toThrow(/No user found/)
  })

  it('rejects a used or unknown reset token', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'old' })
    const token = requestPasswordReset(user.email)
    resetPassword(token, 'new')

    expect(() => resetPassword(token, 'again')).toThrow(/invalid or has already been used/)
    expect(() => resetPassword('not-a-real-token', 'x')).toThrow(/invalid/)
  })

  it('rejects an expired reset token', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'old' })
    const fixedNow = 1_700_000_000_000
    setUsersNow(() => fixedNow)

    const token = requestPasswordReset(user.email)
    setUsersNow(() => fixedNow + 16 * 60 * 1000)

    expect(() => resetPassword(token, 'new')).toThrow(/expired/)
    expect(authenticateUser('bob@example.com', 'old')).not.toBeNull()
  })

  it('notifies the user when the password is changed', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'old' })
    const token = requestPasswordReset(user.email)
    resetPassword(token, 'new')

    const notifications = getUserNotifications(user.id)
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.type).toBe('security')
  })

  it('seeds the demo user', () => {
    expect(getUserByEmail(DEMO_USER_EMAIL)?.name).toBe('Alice Example')
    expect(authenticateUser(DEMO_USER_EMAIL, DEMO_USER_PASSWORD)).not.toBeNull()
  })
})