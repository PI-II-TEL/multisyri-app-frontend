'use client'
import { useEffect, useRef, useState } from 'react'

export type MapEvent = {
  event: string
  building_id: string
  payload: Record<string, unknown>
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

type Options = {
  onMessage: (msg: MapEvent) => void
  enabled?: boolean
}

const RECONNECT_DELAY_MS = 5000

function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/v1/ws/map`
  }
  return 'ws://localhost:8000/api/v1/ws/map'
}

export function useMapWebSocket({ onMessage, enabled = true }: Options): { wsStatus: WsStatus } {
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const [internalStatus, setInternalStatus] = useState<WsStatus>('connecting')

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    let cancelled = false
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return

      const token = localStorage.getItem('access_token')
      if (!token) {
        // Token may appear after auth completes — retry instead of giving up.
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
        return
      }

      setInternalStatus('connecting')
      ws = new WebSocket(`${getWsUrl()}?token=${encodeURIComponent(token)}`)

      ws.onopen = () => {
        if (cancelled) return
        setInternalStatus('connected')
      }

      ws.onmessage = (ev: MessageEvent) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(ev.data as string) as MapEvent
          onMessageRef.current(msg)
        } catch {
          // Ignore malformed frames; the next event will trigger another callback.
        }
      }

      ws.onclose = () => {
        if (cancelled) return
        setInternalStatus('disconnected')
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [enabled])

  return { wsStatus: enabled ? internalStatus : 'disconnected' }
}
