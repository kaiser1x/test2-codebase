import { beforeEach, describe, expect, it } from 'vitest'
import {
  createPayment,
  createUser,
  getPayment,
  getUserPayments,
  refund,
  resetState,
} from '../src/index'

beforeEach(() => {
  resetState()
})

describe('payments', () => {
  it('charges a user successfully', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const payment = createPayment(user.id, 1350)

    expect(payment.userId).toBe(user.id)
    expect(payment.amount).toBe(1350)
    expect(payment.status).toBe('succeeded')
    expect(getPayment(payment.id)?.id).toBe(payment.id)
  })

  it('rejects unknown users and non-positive amounts', () => {
    expect(() => createPayment('no-such-user', 100)).toThrow(/Unknown user/)

    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    expect(() => createPayment(user.id, 0)).toThrow(/positive number/)
    expect(() => createPayment(user.id, -5)).toThrow(/positive number/)
  })

  it('refunds a succeeded payment exactly once', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const payment = createPayment(user.id, 800)

    const refunded = refund(payment.id)
    expect(refunded.status).toBe('refunded')
    expect(refunded.amount).toBe(800)

    expect(() => refund(payment.id)).toThrow(/cannot be refunded/)
  })

  it('lists a user payments newest first', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const first = createPayment(user.id, 100)
    const second = createPayment(user.id, 200)

    expect(getUserPayments(user.id).map((payment) => payment.id)).toEqual([
      second.id,
      first.id,
    ])
  })
})