export * from './users'
export * from './payments'
export * from './cart'
export * from './orders'
export * from './sessions'
export * from './notifications'
export {
  PRODUCTS,
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  getProduct,
  getProductOrThrow,
  seedState,
  type Product,
} from './fixtures'

import { resetSessions } from './sessions'
import { resetPayments } from './payments'
import { resetCarts } from './cart'
import { resetOrders } from './orders'
import { resetNotifications } from './notifications'
import { seedState } from './fixtures'

export function resetState(): void {
  resetSessions()
  resetPayments()
  resetCarts()
  resetOrders()
  resetNotifications()
  seedState()
}