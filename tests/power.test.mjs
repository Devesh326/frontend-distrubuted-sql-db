import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTs,deferred,snapshot,recoverySnapshot} from './load-ts.mjs'
const api=await loadTs('src/services/api.ts')
const {useClusterStore:store}=await loadTs('src/store/clusterStore.ts')
const {withRecoveryMembers}=await loadTs('src/services/recoveryState.ts')
const {buildTopology}=await loadTs('src/components/canvas/topology.ts')

test('power API sends authenticated explicit actions and rejects mismatched acknowledgments',async()=>{
 const original=globalThis.fetch;const calls=[]
 try{
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({node_id:'meta1',action:'stop'}))}
  await api.setNodePower('meta1','stop','private-token')
  assert.equal(calls[0].url,'/api/nodes/power');assert.equal(calls[0].options.headers.Authorization,'Bearer private-token')
  assert.deepEqual(JSON.parse(calls[0].options.body),{node_id:'meta1',action:'stop'})
  await assert.rejects(api.setNodePower('meta1','start','private-token'),/not confirmed/)
 }finally{globalThis.fetch=original}
})

test('power actions deduplicate clicks and never optimistically change health',async()=>{
 const original=globalThis.fetch,initial=store.getState(),pending=deferred();let commands=0
 try{
  const managed={...recoverySnapshot(),experiments_enabled:true}
  store.setState({cluster:api.clusterFromStatus(snapshot()),recovery:managed,recoveryStatus:'connected',controlToken:'private-token'})
  globalThis.fetch=async(url)=>{if(url.endsWith('/power')){commands++;return pending.promise}return new Response('outage',{status:503})}
  const action=store.getState().setNodePower('node-a','stop');await store.getState().setNodePower('node-a','stop')
  assert.equal(commands,1);assert.equal(store.getState().cluster.nodes[0].alive,true)
  pending.resolve(new Response(JSON.stringify({node_id:'node-a',action:'stop'})));await action
  assert.equal(store.getState().cluster.nodes[0].alive,true);assert.equal(store.getState().powerPending['node-a'],false)
  assert.equal(JSON.stringify(store.getState().logs).includes('private-token'),false)
 }finally{store.getState().stopPolling();store.setState(initial);globalThis.fetch=original}
})

test('a fresh page during SQL outage keeps managed storage controllable without inventing shards',()=>{
 const managed={...recoverySnapshot(),power_nodes:[{id:'storage-pool-1',role:'storage',power:'stopped',phase:'held',observed_at:new Date().toISOString()}]}
 const cluster=api.clusterFromStatus(snapshot());cluster.nodes=[];cluster.shards=[]
 const value=withRecoveryMembers(cluster,managed,false,Date.now(),Date.now()),graph=buildTopology(value,false)
 assert.equal(value.nodes[0].alive,false);assert.equal(value.shards.length,0)
 assert.equal(graph.nodes.some(node=>node.type==='storageNode'&&node.data.node.id==='storage-pool-1'),true)
 assert.equal(graph.edges.some(edge=>edge.target==='unassigned-storage-pool-1'),false)
})

test('locked power controls explain that no command was sent',async()=>{
 const initial=store.getState(),original=globalThis.fetch;let sent=false
 try{
  store.setState({controlToken:'',powerPending:{},powerErrors:{}})
  globalThis.fetch=async()=>{sent=true;throw new Error('unexpected request')}
  await store.getState().setNodePower('meta1','stop')
  assert.equal(sent,false)
  assert.match(store.getState().powerErrors.meta1,/No command was sent/)
 }finally{store.setState(initial);globalThis.fetch=original}
})
