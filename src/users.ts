import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { createNotification } from './notifications'

export interface NewUserInput {
  email: string
  name: string
  password: string
}

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  createdAt: number
}

export interface PublicUser {
  id: string
  email: string
  name: string
  createdAt: number
}

interface PasswordResetRecord {
  userId: string
  expiresAt: number
}

interface UsersStore {
  users: Map<string, User>
  idsByEmail: Map<string, string>
  resets: Map<string, PasswordResetRecord>
  now: () => number
}

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const store: UsersStore = {
  users: new Map(),
  idsByEmail: new Map(),
  resets: new Map(),
  now: () => Date.now(),
}

export function setUsersNow(now: () => number): void {
  store.now = now
}

export function resetUsers(): void {
  store.users.clear()
  store.idsByEmail.clear()
  store.resets.clear()
  store.now = () => Date.now()
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex')
}

function passwordsMatch(password: string, user: User): boolean {
  const expected = Buffer.from(user.passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, user.salt), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function createUser(input: NewUserInput): PublicUser {
  const email = normalizeEmail(input.email)
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`Invalid email address: ${input.email}`)
  }
  if (store.idsByEmail.has(email)) {
    throw new Error(`A user with email ${email} already exists`)
  }
  const name = input.name.trim()
  if (name.length === 0) throw new Error('Name is required')

  const id = randomUUID()
  const salt = randomBytes(16).toString('hex')
  const user: User = {
    id,
    email,
    name,
    passwordHash: hashPassword(input.password, salt),
    salt,
    createdAt: store.now(),
  }
  store.users.set(id, user)
  store.idsByEmail.set(email, id)
  return toPublicUser(user)
}

export function getUserById(id: string): PublicUser | null {
  const user = store.users.get(id)
  return user ? toPublicUser(user) : null
}

export function getUserByIdOrThrow(id: string): PublicUser {
  const user = getUserById(id)
  if (!user) throw new Error(`Unknown user: ${id}`)
  return user
}

export function getUserByEmail(email: string): PublicUser | null {
  const id = store.idsByEmail.get(normalizeEmail(email))
  if (!id) return null
  const user = store.users.get(id)
  return user ? toPublicUser(user) : null
}

export function authenticateUser(email: string, password: string): PublicUser | null {
  const id = store.idsByEmail.get(normalizeEmail(email))
  if (!id) return null
  const user = store.users.get(id)
  if (!user) return null
  return passwordsMatch(password, user) ? toPublicUser(user) : null
}

export function requestPasswordReset(email: string): string {
  const normalized = normalizeEmail(email)
  const id = store.idsByEmail.get(normalized)
  if (!id) throw new Error(`No user found for email ${normalized}`)
  const token = generateToken()
  store.resets.set(hashToken(token), {
    userId: id,
    expiresAt: store.now() + PASSWORD_RESET_TTL_MS,
  })
  return token
}

export function resetPassword(token: string, newPassword: string): PublicUser {
  const key = hashToken(token)
  const record = store.resets.get(key)
  if (!record) {
    throw new Error('Password reset token is invalid or has already been used')
  }
  if (Date.now() > record.expiresAt) {
    store.resets.delete(key)
    throw new Error('Password reset token has expired')
  }
  const user = store.users.get(record.userId)
  if (!user) throw new Error('Password reset token is invalid or has already been used')

  const salt = randomBytes(16).toString('hex')
  user.passwordHash = hashPassword(newPassword, salt)
  user.salt = salt
  store.resets.delete(key)
  createNotification(user.id, 'security', 'Your password was changed')
  return toPublicUser(user)
}