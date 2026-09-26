import { beforeEach, describe, expect, it } from 'vitest'
import {
  addItem,
  cancelOrder,
  createCart,
  createOrder,
  createUser,
  getOrder,
  getPayment,
  getUserNotifications,
  getUserOrders,
  isCartEmpty,
  resetState,
  shipOrder,
} from '../src/index'

function userWithCart() {
  const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
  const cart = createCart(user.id)
  addItem(cart.id, 'prod-latte', 2)
  addItem(cart.id, 'prod-sourdough', 1)
  return { user, cart }
}

beforeEach(() => {
  resetState()
})

describe('orders', () => {
  it('creates an order from a cart, pays, and clears the cart', () => {
    const { user, cart } = userWithCart()
    const order = createOrder(user.id, cart.id)

    expect(order.total).toBe(2 * 450 + 600)
    expect(order.items).toHaveLength(2)
    expect(order.status).toBe('paid')
    expect(getPayment(order.paymentId)?.status).toBe('succeeded')
    expect(isCartEmpty(cart.id)).toBe(true)
    expect(getOrder(order.id)?.id).toBe(order.id)
  })

  it('applies a discount code to the order total', () => {
    const { user, cart } = userWithCart()
    const order = createOrder(user.id, cart.id, 'SAVE10')

    expect(order.total).toBe(1350)
    expect(getPayment(order.paymentId)?.amount).toBe(order.total)
  })

  it('raises order and payment notifications on checkout', () => {
    const { user, cart } = userWithCart()
    createOrder(user.id, cart.id)

    const notifications = getUserNotifications(user.id)
    expect(notifications.map((notification) => notification.type).sort()).toEqual([
      'order',
      'payment',
    ])
  })

  it('rejects orders from empty carts', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    expect(() => createOrder(user.id, cart.id)).toThrow(/empty cart/)
  })

  it('rejects orders for carts owned by another user', () => {
    const { cart } = userWithCart()
    const other = createUser({ email: 'carol@example.com', name: 'Carol', password: 'x' })

    expect(() => createOrder(other.id, cart.id)).toThrow(/does not belong to user/)
  })

  it('lists a user orders newest first', () => {
    const { user, cart } = userWithCart()
    const first = createOrder(user.id, cart.id)

    addItem(cart.id, 'prod-latte', 1)
    const second = createOrder(user.id, cart.id)

    expect(getUserOrders(user.id).map((order) => order.id)).toEqual([second.id, first.id])
  })

  it('ships a paid order exactly once', () => {
    const { user, cart } = userWithCart()
    const order = createOrder(user.id, cart.id)

    expect(shipOrder(order.id).status).toBe('shipped')
    expect(() => shipOrder(order.id)).toThrow(/Only paid orders/)
  })

  it('cancels a paid order, refunds, and notifies', () => {
    const { user, cart } = userWithCart()
    const order = createOrder(user.id, cart.id)

    const cancelled = cancelOrder(order.id)
    expect(cancelled.status).toBe('cancelled')
    expect(getPayment(order.paymentId)?.status).toBe('refunded')

    expect(() => cancelOrder(order.id)).toThrow(/already cancelled/)

    const notifications = getUserNotifications(user.id)
    expect(notifications.some((notification) => notification.message.includes('Refund'))).toBe(
      true,
    )
  })

  it('rejects cancellation of shipped orders', () => {
    const { user, cart } = userWithCart()
    const order = createOrder(user.id, cart.id)

    shipOrder(order.id)
    expect(() => cancelOrder(order.id)).toThrow(/Shipped orders cannot be cancelled/)
  })

  it('returns null for unknown orders', () => {
    expect(getOrder('no-such-order')).toBeNull()
  })
})