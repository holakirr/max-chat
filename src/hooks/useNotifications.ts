import { useEffect, useRef, useState } from 'react'
import type { GreenApiClient } from '../api/greenApi'
import { GreenApiError } from '../api/greenApi'
import type { NotificationBody } from '../api/greenApi'

const RECEIVE_TIMEOUT_SEC = 20
const RETRY_DELAY_MS = 3000

// Длинный опрос очереди уведомлений: receiveNotification → обработка → deleteNotification.
// https://green-api.com/v3/docs/api/receiving/technology-http-api/
export function useNotifications(client: GreenApiClient | null, onNotification: (body: NotificationBody) => void) {
  const handler = useRef(onNotification)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handler.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!client) return
    const controller = new AbortController()
    let stopped = false

    const sleep = (ms: number) =>
      new Promise<void>(resolve => {
        const t = setTimeout(resolve, ms)
        controller.signal.addEventListener('abort', () => {
          clearTimeout(t)
          resolve()
        })
      })

    ;(async () => {
      while (!stopped) {
        try {
          const notification = await client.receiveNotification(RECEIVE_TIMEOUT_SEC, controller.signal)
          setError(null)
          if (!notification) continue
          try {
            handler.current(notification.body)
          } finally {
            await client.deleteNotification(notification.receiptId)
          }
        } catch (e) {
          if (stopped) return
          setError(describe(e))
          await sleep(RETRY_DELAY_MS)
        }
      }
    })()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [client])

  return error
}

export function describe(e: unknown): string {
  if (e instanceof GreenApiError) {
    if (e.status === 401 || e.status === 403) return 'Неверные idInstance или apiTokenInstance'
    if (e.status === 429) return 'Слишком много запросов, повторим позже'
    return `${e.status}: ${e.message}`
  }
  if (e instanceof Error) return e.name === 'AbortError' ? '' : e.message || 'Нет связи с GREEN-API'
  return 'Неизвестная ошибка'
}
