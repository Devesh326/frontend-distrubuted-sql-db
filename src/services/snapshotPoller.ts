// One status response updates topology and metrics together. Invalidation fences
// late responses after unmount; an old finally cannot clear a newer request.
export function createSnapshotPoller<T>(dependencies: {
  fetch: (signal: AbortSignal) => Promise<T>
  apply: (value: T) => void
  failed: (error: unknown) => void
}) {
  let current: { controller: AbortController; promise: Promise<void> } | null = null
  return {
    refresh(): Promise<void> {
      if (current) return current.promise
      const entry = { controller: new AbortController(), promise: Promise.resolve() }
      current = entry
      entry.promise = Promise.resolve().then(() => dependencies.fetch(entry.controller.signal))
        .then(value => { if (current === entry) dependencies.apply(value) })
        .catch(error => { if (current === entry) dependencies.failed(error) })
        .finally(() => { if (current === entry) current = null })
      return entry.promise
    },
    invalidate() { const previous = current; current = null; previous?.controller.abort() },
  }
}
