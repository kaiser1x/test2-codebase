import { createUser, resetUsers } from './users'
import type { PublicUser } from './users'

export interface Product {
  id: string
  name: string
  price: number
}

export const PRODUCTS: readonly Product[] = [
  { id: 'prod-sourdough', name: 'Sourdough loaf', price: 600 },
  { id: 'prod-tomato', name: 'Heirloom tomato', price: 250 },
  { id: 'prod-cheddar', name: 'Aged cheddar', price: 1200 },
  { id: 'prod-eggs', name: 'Free-range eggs', price: 800 },
  { id: 'prod-latte', name: 'Oat milk latte', price: 450 },
]

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === productId)
}

export function getProductOrThrow(productId: string): Product {
  const product = getProduct(productId)
  if (!product) throw new Error(`Unknown product: ${productId}`)
  return product
}

export const DEMO_USER_EMAIL = 'alice@example.com'
export const DEMO_USER_PASSWORD = 'correct-horse-battery-staple'

export function seedState(): PublicUser {
  resetUsers()
  return createUser({
    email: DEMO_USER_EMAIL,
    name: 'Alice Example',
    password: DEMO_USER_PASSWORD,
  })
}