import { useClusterStore } from '@/store/clusterStore'
import { createEventConnection, type EventSocket } from './eventConnection'
import type { WsEvent } from '@/types'

function eventURL(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const base = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')
  const url = new URL(base + '/api/ws', window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
export function validEvent(value: unknown): value is WsEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<WsEvent>
  return typeof event.type === 'string' && typeof event.timestamp === 'string'
    && Number.isFinite(Date.parse(event.timestamp))
    && (event.node_id === undefined || typeof event.node_id === 'string')
    && (event.metadata === undefined || (event.metadata !== null && typeof event.metadata === 'object' && !Array.isArray(event.metadata)))
}
const connection = createEventConnection({
  socket: () => new WebSocket(eventURL()) as unknown as EventSocket,
  receive: event => { if (validEvent(event)) useClusterStore.getState().processEvent(event) },
})
export const connect = () => connection.connect()
export const disconnect = () => connection.disconnect()
