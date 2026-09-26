import { beforeEach, describe, expect, it } from 'vitest'
import {
  PRODUCTS,
  addItem,
  addItemAsNewLine,
  clearCart,
  createCart,
  createUser,
  getCart,
  getCartItems,
  getCartTotal,
  getProductOrThrow,
  isCartEmpty,
  removeItem,
  resetState,
  updateItemQuantity,
} from '../src/index'

beforeEach(() => {
  resetState()
})

describe('carts', () => {
  it('creates an empty cart for a user', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    expect(getCart(cart.id)?.userId).toBe(user.id)
    expect(isCartEmpty(cart.id)).toBe(true)
    expect(getCartTotal(cart.id)).toBe(0)
  })

  it('adds items and snapshots product name and price', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)
    const product = getProductOrThrow(PRODUCTS[0]!.id)

    addItem(cart.id, product.id, 2)

    expect(getCartItems(cart.id)).toEqual([
      { productId: product.id, name: product.name, unitPrice: product.price, quantity: 2 },
    ])
    expect(getCartTotal(cart.id)).toBe(product.price * 2)
  })

  it('increments quantity when the same product is added again', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    addItem(cart.id, 'prod-latte', 1)
    addItem(cart.id, 'prod-latte', 2)

    expect(getCartItems(cart.id)).toEqual([
      { productId: 'prod-latte', name: 'Oat milk latte', unitPrice: 450, quantity: 3 },
    ])
    expect(getCartTotal(cart.id)).toBe(1350)
  })

  it('updates and removes items', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    addItem(cart.id, 'prod-latte', 1)
    addItem(cart.id, 'prod-tomato', 1)
    updateItemQuantity(cart.id, 'prod-latte', 4)
    removeItem(cart.id, 'prod-tomato')

    const items = getCartItems(cart.id)
    expect(items).toHaveLength(1)
    expect(items[0]?.quantity).toBe(4)
  })

  it('rejects unknown products and invalid quantities', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    expect(() => addItem(cart.id, 'prod-does-not-exist', 1)).toThrow(/Unknown product/)
    expect(() => addItem(cart.id, 'prod-latte', 0)).toThrow(/positive integer/)
    expect(() => addItem(cart.id, 'prod-latte', 1.5)).toThrow(/positive integer/)
  })

  it('clears a cart', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    addItem(cart.id, 'prod-latte', 2)
    clearCart(cart.id)

    expect(isCartEmpty(cart.id)).toBe(true)
    expect(getCartTotal(cart.id)).toBe(0)
  })

  it('removes the intended line when a product appears more than once', () => {
    const user = createUser({ email: 'bob@example.com', name: 'Bob', password: 'x' })
    const cart = createCart(user.id)

    addItem(cart.id, 'prod-latte', 1)
    addItemAsNewLine(cart.id, 'prod-latte', 2)

    removeItem(cart.id, 'prod-latte')

    const latteLines = getCartItems(cart.id).filter((item) => item.productId === 'prod-latte')
    expect(latteLines).toHaveLength(1)
    expect(latteLines[0]?.quantity).toBe(2)
  })
})