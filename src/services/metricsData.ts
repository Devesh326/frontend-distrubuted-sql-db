import type { MetricSample, Metrics } from '@/types'

export const MAX_SAMPLES = 120
export function appendSample(history: MetricSample[], metrics: Metrics, timestamp: number): MetricSample[] {
  return [...history, { ...metrics, timestamp }].slice(-MAX_SAMPLES)
}
export function queryRate(current: MetricSample, previous?: MetricSample): number | null {
  if (!previous || current.coordinatorId !== previous.coordinatorId || current.queryCount === null || previous.queryCount === null) return null
  const elapsed = current.timestamp - previous.timestamp
  if (elapsed <= 0 || elapsed > 30_000 || current.queryCount < previous.queryCount) return null
  return (current.queryCount - previous.queryCount) * 1000 / elapsed
}
export function chartSamples(history: MetricSample[], coordinatorId: string) {
  return history.filter(sample => sample.coordinatorId === coordinatorId).map((sample, index, samples) => ({
    ...sample, time: new Date(sample.timestamp).toLocaleTimeString(), throughput: queryRate(sample, samples[index - 1]),
  }))
}
export function isFresh(observedAt: number, receivedAt: number, now: number): boolean {
  return observedAt > 0 && receivedAt > 0 && now - observedAt <= 15_000 && now - receivedAt <= 15_000 && observedAt <= now + 1000
}
