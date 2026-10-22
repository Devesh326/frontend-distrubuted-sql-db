import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTs,deferred,snapshot,recoverySnapshot} from './load-ts.mjs'
const {createSnapshotPoller}=await loadTs('src/services/snapshotPoller.ts')
const metrics=await loadTs('src/services/metricsData.ts')
const api=await loadTs('src/services/api.ts')
const {buildTopology}=await loadTs('src/components/canvas/topology.ts')
const recovery=await loadTs('src/services/recoveryState.ts')

test('status polling deduplicates requests and fences cancelled responses',async()=>{
  const pending=[deferred(),deferred()];let requests=0;const applied=[],errors=[]
  const poller=createSnapshotPoller({fetch:()=>pending[requests++].promise,apply:value=>applied.push(value),failed:error=>errors.push(error)})
  const old=poller.refresh();assert.equal(old,poller.refresh());await Promise.resolve();assert.equal(requests,1)
  poller.invalidate();const current=poller.refresh();await Promise.resolve()
  pending[0].resolve('old');await old;assert.deepEqual(applied,[])
  assert.equal(current,poller.refresh());pending[1].resolve('current');await current
  assert.deepEqual(applied,['current']);assert.deepEqual(errors,[])
})
test('failed polls are reported and a subsequent poll can recover',async()=>{
  let fail=true;const applied=[],errors=[]
  const poller=createSnapshotPoller({fetch:async()=>{if(fail)throw Error('unavailable');return 'fresh'},apply:value=>applied.push(value),failed:error=>errors.push(error.message)})
  await poller.refresh();fail=false;await poller.refresh();assert.deepEqual(errors,['unavailable']);assert.deepEqual(applied,['fresh'])
})
test('rates reject source switches, counter resets, gaps and missing observations',()=>{
  const base={coordinatorId:'coord-1',queryCount:10,timestamp:1000}
  assert.equal(metrics.queryRate({...base,queryCount:20,timestamp:6000},base),2)
  for(const current of [{...base,coordinatorId:'coord-2'},{...base,queryCount:9,timestamp:6000},{...base,timestamp:60000},{...base,queryCount:null},{...base,timestamp:1000}]) assert.equal(metrics.queryRate(current,base),null)
  assert.equal(metrics.isFresh(1000,1000,17000),false)
  const history=Array.from({length:120},(_,i)=>({...base,timestamp:i}));assert.equal(metrics.appendSample(history,base,999).length,120)
})
test('snapshot conversion preserves responding coordinator and unknown measurements',()=>{
  const data=snapshot('coord-2');data.coordinators.unshift({...data.coordinator,id:'coord-1'})
  const cluster=api.clusterFromStatus(data),values=api.metricsFromStatus(data)
  assert.equal(cluster.coordinator.id,'coord-2');assert.equal(values.coordinatorId,'coord-2');assert.equal(values.queryCount,0);assert.equal(values.averageLatency,null)
  data.metrics.nodes_total=0;assert.equal(api.metricsFromStatus(data).clusterHealth,null)
})
test('topology keeps replicas when no leader is reported and shows both coordinator routes',()=>{
  const data=snapshot();data.coordinators.push({...data.coordinator,id:'coord-1'})
  const cluster=api.clusterFromStatus(data)
  let graph=buildTopology(cluster,true)
  assert.equal(graph.edges.filter(edge=>edge.target==='shard-0-node-a').length,2)
  assert.equal(graph.nodes.find(node=>node.id==='shard-0-missing-peer').data.reported,false)
  cluster.shards[0].leader='';graph=buildTopology(cluster,true)
  assert.equal(graph.nodes.filter(node=>node.type==='storageNode').length,2)
  assert.equal(graph.nodes.some(node=>node.type==='storageNode'&&node.data.node.isLeader),false)
  assert.equal(graph.edges.some(edge=>!graph.nodes.some(node=>node.id===edge.source)||!graph.nodes.some(node=>node.id===edge.target)),false)
})
test('recovery status supplies original identities during SQL-status outage without inventing leaders',()=>{
  const data=snapshot(),cluster=api.clusterFromStatus(data),managed=recoverySnapshot();const now=Date.now()
  const graph=recovery.withRecoveryMembers({...cluster,nodes:[],shards:[],metadataCluster:null},managed,false,now,now)
  assert.equal(graph.coordinators.length,2);assert.equal(graph.metadataCluster.nodes.length,3);assert.equal(graph.metadataCluster.leaderId,'');assert.equal(graph.nodes.length,0)
  assert.equal(recovery.freshRecovery(managed.targets[0],now,now+7000),false)
  managed.targets[1].id=managed.targets[0].id;assert.throws(()=>recovery.validateRecovery(managed),/invalid/)
})
test('API rejects stale snapshots and makes authenticated recovery changes without reset or retry',async()=>{
  const original=globalThis.fetch;const calls=[]
  try{
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({...snapshot(),observed_at:new Date(Date.now()-60000).toISOString()}),{status:200})}
    await assert.rejects(api.getSnapshot(),/stale/)
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({node_id:'meta1',mode:'hold'}),{status:200})}
    await api.setRecoveryMode('meta1','hold','test-token')
    const call=calls.at(-1);assert.equal(call.url,'/api/recovery/mode');assert.equal(call.options.headers.Authorization,'Bearer test-token');assert.deepEqual(JSON.parse(call.options.body),{node_id:'meta1',mode:'hold'})
    let attempts=0;globalThis.fetch=async()=>{attempts++;return new Response('unauthorized',{status:401})}
    await assert.rejects(api.setRecoveryMode('meta1','hold','bad-token'),/unauthorized/);assert.equal(attempts,1)
  }finally{globalThis.fetch=original}
})
