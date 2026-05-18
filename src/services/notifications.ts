import { apiFetch } from './api'

export type NotificationType = 'HOURS_ALERT' | 'TICKET_ESCALATED' | 'TICKET_RESOLVED' | string

export interface NotificationRead {
  id: string
  type: NotificationType
  body: string
  is_read: boolean
  sent_at: string
  read_at: string | null
}

export async function getNotifications(): Promise<NotificationRead[]> {
  return apiFetch<NotificationRead[]>('/notifications')
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  return apiFetch<void>('/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify({ notification_ids: notificationIds }),
  })
}
