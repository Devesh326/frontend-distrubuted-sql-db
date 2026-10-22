import { useEffect, useRef } from 'react'
import { useClusterStore } from '@/store/clusterStore'
import * as api from '@/services/api'
import { classifyQueryType, createExecutionController } from './executionController'

const QUERY_COLORS: Record<string,string> = {
 SELECT:'#22d3ee', INSERT:'#34d399', UPDATE:'#fbbf24',
 DELETE:'#f472b6', COUNT:'#a78bfa', JOIN:'#fb923c',
}
export function useExecutionEngine() {
 const ref=useRef<ReturnType<typeof createExecutionController>|null>(null)
 if(!ref.current)ref.current=createExecutionController({
  getState:useClusterStore.getState,setState:useClusterStore.setState,
  executeQuery:api.executeQuery,
 })
 const controller=ref.current
 useEffect(()=>()=>controller.abortExecution(),[controller])
 return {...controller,parseQuery:classifyQueryType,queryColors:QUERY_COLORS}
}
