import { randomUUID } from 'node:crypto'
import { getUserById } from './users'

export type PaymentStatus = 'succeeded' | 'refunded' | 'failed'

export interface Payment {
  id: string
  userId: string
  amount: number
  status: PaymentStatus
  createdAt: number
}

interface PaymentsStore {
  payments: Map<string, Payment>
  paymentIds: string[]
  now: () => number
}

const store: PaymentsStore = {
  payments: new Map(),
  paymentIds: [],
  now: () => Date.now(),
}

export function resetPayments(): void {
  store.payments.clear()
  store.paymentIds = []
  store.now = () => Date.now()
}

export function createPayment(userId: string, amount: number): Payment {
  const user = getUserById(userId)
  if (!user) throw new Error(`Unknown user: ${userId}`)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payment amount must be a positive number')
  }

  const payment: Payment = {
    id: randomUUID(),
    userId,
    amount,
    status: 'succeeded',
    createdAt: store.now(),
  }
  store.payments.set(payment.id, payment)
  store.paymentIds.push(payment.id)
  return payment
}

export function getPayment(paymentId: string): Payment | null {
  return store.payments.get(paymentId) ?? null
}

export function getPaymentOrThrow(paymentId: string): Payment {
  const payment = getPayment(paymentId)
  if (!payment) throw new Error(`Unknown payment: ${paymentId}`)
  return payment
}

export function refund(paymentId: string): Payment {
  const payment = getPaymentOrThrow(paymentId)
  if (payment.status !== 'succeeded') {
    throw new Error(`Payment ${paymentId} cannot be refunded (status: ${payment.status})`)
  }
  payment.status = 'refunded'
  return payment
}

export function getUserPayments(userId: string): Payment[] {
  const payments: Payment[] = []
  for (const id of store.paymentIds) {
    const payment = store.payments.get(id)
    if (payment && payment.userId === userId) payments.push(payment)
  }
  return [...payments].reverse()
}