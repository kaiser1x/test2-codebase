import { randomUUID } from 'node:crypto'
import { getUserByIdOrThrow } from './users'
import { clearCart, getCart, getCartItems, getCartTotal } from './cart'
import type { CartItem } from './cart'
import { createPayment, refund } from './payments'
import { createNotification } from './notifications'

export type OrderStatus = 'paid' | 'shipped' | 'cancelled'

export interface Order {
  id: string
  userId: string
  items: CartItem[]
  total: number
  paymentId: string
  status: OrderStatus
  createdAt: number
}

interface OrdersStore {
  orders: Map<string, Order>
  orderIds: string[]
  now: () => number
}

const store: OrdersStore = {
  orders: new Map(),
  orderIds: [],
  now: () => Date.now(),
}

export function resetOrders(): void {
  store.orders.clear()
  store.orderIds = []
  store.now = () => Date.now()
}

function formatMoney(amount: number): string {
  return (amount / 100).toFixed(2)
}

export function applyDiscount(subtotal: number, discountCode: string | undefined): number {
  if (!discountCode) return subtotal
  if (discountCode === 'SAVE10') return Math.round(subtotal * 0.9)
  throw new Error(`Unknown discount code: ${discountCode}`)
}

export function createOrder(userId: string, cartId: string, discountCode?: string): Order {
  const user = getUserByIdOrThrow(userId)
  const cart = getCart(cartId)
  if (!cart) throw new Error(`Unknown cart: ${cartId}`)
  if (cart.userId !== user.id) {
    throw new Error(`Cart ${cartId} does not belong to user ${userId}`)
  }

  const items = getCartItems(cartId)
  if (items.length === 0) throw new Error('Cannot place an order with an empty cart')

  const subtotal = getCartTotal(cartId)
  const total = applyDiscount(subtotal, discountCode)
  const payment = createPayment(user.id, total)
  const order: Order = {
    id: randomUUID(),
    userId: user.id,
    items,
    total: subtotal,
    paymentId: payment.id,
    status: 'paid',
    createdAt: store.now(),
  }
  store.orders.set(order.id, order)
  store.orderIds.push(order.id)
  clearCart(cartId)
  createNotification(user.id, 'order', `Order ${order.id} placed`)
  createNotification(user.id, 'payment', `Payment of ${formatMoney(total)} received`)
  return order
}

export function getOrder(orderId: string): Order | null {
  return store.orders.get(orderId) ?? null
}

export function getOrderOrThrow(orderId: string): Order {
  const order = getOrder(orderId)
  if (!order) throw new Error(`Unknown order: ${orderId}`)
  return order
}

export function getUserOrders(userId: string): Order[] {
  const orders: Order[] = []
  for (const id of store.orderIds) {
    const order = store.orders.get(id)
    if (order && order.userId === userId) orders.push(order)
  }
  return [...orders].reverse()
}

export function shipOrder(orderId: string): Order {
  const order = getOrderOrThrow(orderId)
  if (order.status !== 'paid') {
    throw new Error(`Only paid orders can be shipped (status: ${order.status})`)
  }
  order.status = 'shipped'
  return order
}

export function cancelOrder(orderId: string): Order {
  const order = getOrderOrThrow(orderId)
  if (order.status === 'cancelled') {
    throw new Error(`Order ${orderId} is already cancelled`)
  }
  if (order.status === 'shipped') {
    throw new Error('Shipped orders cannot be cancelled')
  }

  const payment = refund(order.paymentId)
  order.status = 'cancelled'
  createNotification(order.userId, 'payment', `Refund of ${formatMoney(payment.amount)} issued`)
  return order
}