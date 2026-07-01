import { useQuery } from '@tanstack/react-query'
import { getMetrics } from '@/services/api'

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: 5000,
  })
}
