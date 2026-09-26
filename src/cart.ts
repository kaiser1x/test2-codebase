import { randomUUID } from 'node:crypto'
import { getProductOrThrow } from './fixtures'

export interface CartItem {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

export interface Cart {
  id: string
  userId: string
  items: Map<string, CartItem>
  createdAt: number
}

interface CartsStore {
  carts: Map<string, Cart>
  now: () => number
}

const store: CartsStore = {
  carts: new Map(),
  now: () => Date.now(),
}

export function resetCarts(): void {
  store.carts.clear()
  store.now = () => Date.now()
}

export function createCart(userId: string): Cart {
  const cart: Cart = {
    id: randomUUID(),
    userId,
    items: new Map(),
    createdAt: store.now(),
  }
  store.carts.set(cart.id, cart)
  return cart
}

export function getCart(cartId: string): Cart | null {
  return store.carts.get(cartId) ?? null
}

export function getCartOrThrow(cartId: string): Cart {
  const cart = getCart(cartId)
  if (!cart) throw new Error(`Unknown cart: ${cartId}`)
  return cart
}

function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer')
  }
}

export function addItem(cartId: string, productId: string, quantity: number): Cart {
  assertValidQuantity(quantity)
  const cart = getCartOrThrow(cartId)
  const product = getProductOrThrow(productId)

  const existing = cart.items.get(productId)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.items.set(productId, {
      productId,
      name: product.name,
      unitPrice: product.price,
      quantity,
    })
  }
  return cart
}

export function updateItemQuantity(cartId: string, productId: string, quantity: number): Cart {
  assertValidQuantity(quantity)
  const cart = getCartOrThrow(cartId)
  const item = cart.items.get(productId)
  if (!item) throw new Error(`Cart ${cartId} has no item for product ${productId}`)
  item.quantity = quantity
  return cart
}

export function removeItem(cartId: string, productId: string): Cart {
  const cart = getCartOrThrow(cartId)
  cart.items.delete(productId)
  return cart
}

export function clearCart(cartId: string): void {
  getCartOrThrow(cartId).items.clear()
}

export function getCartItems(cartId: string): CartItem[] {
  return [...getCartOrThrow(cartId).items.values()]
}

export function getCartTotal(cartId: string): number {
  let total = 0
  for (const item of getCartOrThrow(cartId).items.values()) {
    total += item.unitPrice * item.quantity
  }
  return total
}

export function isCartEmpty(cartId: string): boolean {
  return getCartOrThrow(cartId).items.size === 0
}