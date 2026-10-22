export interface EventSocket {
  readyState: number
  onopen: (() => void) | null
  onmessage: ((message: { data: string }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  close: () => void
}
export function createEventConnection(deps: {
  socket: () => EventSocket
  receive: (value: unknown) => void
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  cancel?: (timer: ReturnType<typeof setTimeout>) => void
  random?: () => number
}) {
  let enabled = false
  let socket: EventSocket | null = null
  let timer: ReturnType<typeof setTimeout> | number | null = null
  let attempt = 0
  const cancel = deps.cancel ?? clearTimeout
  const retry = () => {
    if (!enabled || timer !== null) return
    const delay = Math.min(1000 * 2 ** Math.min(attempt++, 5), 30_000) + (deps.random ?? Math.random)() * 1000
    timer = (deps.schedule ?? setTimeout)(() => { timer = null; open() }, delay)
  }
  const open = () => {
    if (!enabled || socket) return
    let next: EventSocket
    try { next = deps.socket() } catch { retry(); return }
    socket = next
    next.onopen = () => { if (socket === next && enabled) attempt = 0 }
    next.onmessage = message => {
      if (socket !== next || !enabled) return
      try { deps.receive(JSON.parse(message.data)) } catch { /* Malformed events are ignored. */ }
    }
    next.onclose = () => { if (socket === next) { socket = null; retry() } }
    next.onerror = () => { if (socket === next) next.close() }
  }
  return {
    connect() { enabled = true; open() },
    disconnect() {
      enabled = false
      if (timer !== null) { cancel(timer as ReturnType<typeof setTimeout>); timer = null }
      const previous = socket
      socket = null
      if (previous) { previous.onopen = null; previous.onmessage = null; previous.onclose = null; previous.onerror = null; previous.close() }
      attempt = 0
    },
  }
}
