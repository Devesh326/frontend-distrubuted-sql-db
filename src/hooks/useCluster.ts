import { useQuery } from '@tanstack/react-query'
import { getCluster } from '@/services/api'

export function useCluster() {
  return useQuery({
    queryKey: ['cluster'],
    queryFn: getCluster,
    refetchInterval: 10000,
  })
}
