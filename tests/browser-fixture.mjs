// Presentation-test fixtures only. This is not a SQL engine or recovery demo.
// It binds loopback and never contacts Docker or modifies project data.
import http from 'node:http'
import {snapshot,recoverySnapshot} from './load-ts.mjs'

const token='p2-browser-fixture-token-not-a-secret'
const modes=new Map();let available=true,queries=0
const send=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
const body=async req=>{let data='';for await(const chunk of req){data+=chunk;if(data.length>65536)throw Error('body too large')};return JSON.parse(data||'{}')}
const recovery=()=>{const value=recoverySnapshot();for(const target of value.targets){target.mode=modes.get(target.id)||'automatic';if(!available){target.ready=false;if(['meta2','meta3'].includes(target.id)){target.live=false;target.phase=target.mode==='hold'?'held':'suspected_failure'}else target.phase='waiting_for_dependencies'}};value.metadata_quorum=available?'confirmed':'unavailable';return value}
const server=http.createServer(async(req,res)=>{try{
  if(req.url==='/__test__/status'&&req.method==='POST'){available=(await body(req)).available===true;return send(res,200,{available})}
  if(req.url==='/api/recovery/status')return send(res,200,recovery())
  if(req.url==='/api/recovery/mode'&&req.method==='POST'){
    if(req.headers.authorization!==`Bearer ${token}`)return send(res,401,{error:'Unauthorized recovery control token'})
    const value=await body(req);if(!['hold','automatic'].includes(value.mode)||!recovery().targets.some(target=>target.id===value.node_id))return send(res,400,{error:'Invalid member or mode'})
    modes.set(value.node_id,value.mode);return send(res,200,{node_id:value.node_id,mode:value.mode})
  }
  if(!available)return send(res,503,{error:'No ready coordinator (presentation fixture)'})
  if(req.url==='/status'){
    const value=snapshot('coord-2');value.coordinators.unshift({...value.coordinator,id:'coord-1',port:9001})
    value.nodes=[{id:'node-a',address:'fixture-storage-a:5001',alive:true,is_leader:true,shard_count:1},{id:'node-b',address:'fixture-storage-b:5002',alive:true,is_leader:false,shard_count:1},{id:'node-c',address:'fixture-storage-c:5003',alive:false,is_leader:false,shard_count:1}]
    value.shards=[{id:0,leader:'node-a',replicas:['node-a','node-b','node-c']}]
    value.metadata_cluster={nodes:['meta1','meta2','meta3'].map(id=>({id,address:`fixture-${id}:9500`,is_leader:id==='meta1',healthy:true})),leader_id:'meta1',current_term:2}
    value.metrics={query_count:queries,avg_latency_ms:queries?12:null,nodes_alive:2,nodes_total:3,shard_count:1,replication_factor:3};return send(res,200,value)
  }
  if(req.url==='/query'&&req.method==='POST'){
    const request=await body(req);queries++;const failed=/COUNT|JOIN/i.test(request.query)
    const kinds=failed?['query.submitted','query.parsing','query.complete']:['query.submitted','query.parsing','query.parsed','query.planned','query.routed','node.executing','node.completed','query.aggregating','query.complete']
    const events=kinds.map((type,index)=>({type,trace_id:request.trace_id,timestamp:new Date(Date.now()-12+index).toISOString(),...(['query.routed','node.executing','node.completed'].includes(type)?{node_id:'node-b',shard_id:0}:{}),metadata:type==='query.complete'?{error:failed}:undefined}))
    return send(res,failed?500:200,{rows:failed?[]:[{id:'42',name:'presentation-fixture'}],trace_id:request.trace_id,duration_ms:12,query_type:'select',coordinator_id:'coord-2',events,events_truncated:false,...(failed?{error:'Unsupported aggregate in the supported SQL subset (fixture)'}:{})})
  }
  if(req.url?.endsWith('/stop')&&req.method==='POST')return send(res,502,{error:'Storage refused shutdown (fixture)'})
  send(res,404,{error:'Unknown fixture endpoint'})
}catch(error){send(res,400,{error:error.message})}})
server.listen(18080,'127.0.0.1',()=>console.log('P2 presentation fixture listening on 127.0.0.1:18080'))
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close())
