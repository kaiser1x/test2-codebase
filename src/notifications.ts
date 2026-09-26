import { randomUUID } from 'node:crypto'

export type NotificationType = 'order' | 'payment' | 'security'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: number
}

interface NotificationsStore {
  notifications: Notification[]
  now: () => number
}

const store: NotificationsStore = {
  notifications: [],
  now: () => Date.now(),
}

export function resetNotifications(): void {
  store.notifications = []
  store.now = () => Date.now()
}

export function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
): Notification {
  const notification: Notification = {
    id: randomUUID(),
    userId,
    type,
    message,
    read: false,
    createdAt: store.now(),
  }
  store.notifications.push(notification)
  return notification
}

export function getUserNotifications(userId: string): Notification[] {
  return store.notifications.filter((notification) => notification.userId === userId).reverse()
}

export function getUnreadCount(userId: string): number {
  return store.notifications.filter(
    (notification) => notification.userId === userId && !notification.read,
  ).length
}

export function markAsRead(notificationId: string): Notification {
  const notification = store.notifications.find((entry) => entry.id === notificationId)
  if (!notification) throw new Error(`Unknown notification: ${notificationId}`)
  notification.read = true
  return notification
}

export function markAllAsRead(userId: string): number {
  let count = 0
  for (const notification of store.notifications) {
    if (notification.userId === userId && !notification.read) {
      notification.read = true
      count += 1
    }
  }
  return count
}