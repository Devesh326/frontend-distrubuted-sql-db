import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTs,deferred,snapshot} from './load-ts.mjs'
const {useClusterStore:store}=await loadTs('src/store/clusterStore.ts')
const initial=store.getState()
const reset=()=>{store.getState().stopPolling();store.setState(initial)}
test('initial health is unknown and one response updates topology and metrics atomically',async()=>{
 reset();assert.equal(store.getState().metrics.clusterHealth,null);assert.equal(store.getState().cluster.coordinator.id,'')
 const original=globalThis.fetch;let calls=0
 try{
  const data=snapshot('coord-2');data.metrics.query_count=33
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(data))}
  await Promise.all([store.getState().init(),store.getState().refreshCluster(),store.getState().refreshMetrics()])
  assert.equal(calls,1);assert.equal(store.getState().cluster.coordinator.id,'coord-2');assert.equal(store.getState().metrics.queryCount,33);assert.equal(store.getState().metricHistory.length,1)
  globalThis.fetch=async()=>new Response('no ready upstream',{status:503})
  await store.getState().refreshCluster();assert.equal(store.getState().connectionStatus,'stale');assert.equal(store.getState().metricHistory.length,1);assert.equal(store.getState().cluster.nodes.length,1)
 }finally{reset();globalThis.fetch=original}
})
test('a stop acknowledgment does not fabricate node death and duplicate clicks do not duplicate the command',async()=>{
 reset();const original=globalThis.fetch;const pending=deferred();let commands=0
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify(snapshot()))
  await store.getState().init()
  globalThis.fetch=async(url)=>{if(url.includes('/stop')){commands++;return pending.promise};return new Response('unavailable',{status:503})}
  const action=store.getState().stopNode('node-a');await store.getState().stopNode('node-a');assert.equal(commands,1);assert.equal(store.getState().cluster.nodes[0].alive,true)
  pending.resolve(new Response(JSON.stringify({status:'shutdown_requested',node_id:'node-a'}),{status:202}));await action
  assert.equal(store.getState().cluster.nodes[0].alive,true);assert.equal(store.getState().stoppingNodes['node-a'],false)
  assert.match(store.getState().logs.at(-1).message,/waiting for reported node health/)
 }finally{reset();globalThis.fetch=original}
})
test('failed stop actions are visible and events cannot overwrite query playback or authoritative health',async()=>{
 reset();const original=globalThis.fetch
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify(snapshot()));await store.getState().init()
  globalThis.fetch=async()=>new Response('storage refused shutdown',{status:502})
  await store.getState().stopNode('node-a');assert.match(store.getState().stopErrors['node-a'],/refused/)
  const pending=deferred();globalThis.fetch=()=>pending.promise
  const steps=[{id:'real-query'}];store.setState({executionSteps:steps,isExecuting:true})
  store.getState().processEvent({type:'node.marked.dead',node_id:'node-a',timestamp:new Date().toISOString()})
  assert.equal(store.getState().cluster.nodes[0].alive,true);assert.equal(store.getState().executionSteps,steps)
  pending.resolve(new Response(JSON.stringify(snapshot())));await store.getState().refreshCluster()
 }finally{reset();globalThis.fetch=original}
})
