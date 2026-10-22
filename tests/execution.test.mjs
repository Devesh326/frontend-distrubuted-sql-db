import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source=fs.readFileSync(new URL('../src/components/execution/executionController.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
const {createExecutionController,observedSteps}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function harness(executeQuery){
 let state={isExecuting:false,queryHistory:[],simulationSpeed:1,queryResult:null,queryError:null}
 const controller=createExecutionController({getState:()=>state,setState:p=>{state={...state,...p}},executeQuery,delay:async()=>{}})
 return {controller,get state(){return state},update:p=>{state={...state,...p}}}
}
test('an unrelated update during a real request does not recurse or corrupt results',async()=>{
 const d=deferred();const h=harness(()=>d.promise)
 const request=h.controller.startExecution('SELECT * FROM users')
 h.update({metrics:{queryCount:1}})
 assert.equal(h.state.isExecuting,true)
 d.resolve({rows:[{id:'42',name:'a'}],duration_ms:12,query_type:'select'})
 await request
 assert.equal(h.state.isExecuting,false)
 assert.deepEqual(h.state.queryResult,[{id:'42',name:'a'}])
 assert.equal(h.state.queryHistory.length,1)
 assert.equal(h.state.lastQueryDurationMs,12)
})
test('failure clears busy state, exposes the error, and permits a subsequent query',async()=>{
 let fail=true
 const h=harness(async()=>{if(fail)throw new Error('quorum unavailable');return {rows:[],duration_ms:3,query_type:'select'}})
 await h.controller.startExecution('SELECT * FROM users')
 assert.equal(h.state.isExecuting,false)
 assert.equal(h.state.queryError,'quorum unavailable')
 assert.equal(h.state.queryHistory.length,0)
 fail=false
 await h.controller.startExecution('SELECT * FROM users')
 assert.equal(h.state.queryError,null)
 assert.equal(h.state.queryHistory.length,1)
})
test('cancellation prevents late results overwriting a newer query',async()=>{
 const d=deferred();let calls=0
 const h=harness(()=>++calls===1?d.promise:Promise.resolve({rows:[{id:'2'}],duration_ms:1,query_type:'select'}))
 const old=h.controller.startExecution('SELECT * FROM users WHERE id=1')
 h.controller.abortExecution()
 await h.controller.startExecution('SELECT * FROM users WHERE id=2')
 d.resolve({rows:[{id:'1'}],duration_ms:20,query_type:'select'})
 await old
 assert.deepEqual(h.state.queryResult,[{id:'2'}])
 assert.equal(h.state.queryHistory.length,1)
 assert.equal(h.state.isExecuting,false)
})
test('double submission does not issue duplicate writes',async()=>{
 const d=deferred();let calls=0;const h=harness(()=>{calls++;return d.promise})
 const first=h.controller.startExecution("INSERT INTO users(name) VALUES('a')")
 await h.controller.startExecution("INSERT INTO users(name) VALUES('a')")
 assert.equal(calls,1)
 d.resolve({rows:[],duration_ms:1,query_type:'insert'})
 await first
})

test('query display replays only observations from its own response and uses the responding coordinator',async()=>{
 const h=harness(async(query,trace)=>({rows:[],duration_ms:0,query_type:'select',coordinator_id:'coord-2',events_truncated:true,events:[
  {type:'node.executing',trace_id:'different-request',node_id:'wrong',timestamp:new Date().toISOString()},
  {type:'query.parsed',trace_id:trace,timestamp:new Date().toISOString()},
  {type:'node.executing',trace_id:trace,node_id:'storage-2',shard_id:1,timestamp:new Date().toISOString()},
  {type:'raft.append',trace_id:trace,node_id:'unobserved-replica',timestamp:new Date().toISOString()},
 ]}))
 await h.controller.startExecution('SELECT * FROM users')
 assert.equal(h.state.executionCoordinatorId,'coord-2')
 assert.equal(h.state.executionSteps.some(step=>step.packetTarget==='wrong'||step.packetTarget==='unobserved-replica'),false)
 assert.equal(h.state.executionSteps.some(step=>step.packetTarget==='storage-2'),true)
 assert.equal(h.state.executionProgress,100);assert.equal(h.state.currentStepIndex,h.state.executionSteps.length)
 assert.deepEqual(h.state.queryResult,[]);assert.equal(h.state.lastQueryDurationMs,0)
 assert.match(h.state.executionNotice,/Partial/);assert.equal(h.state.executionPhase,'idle')
 assert.deepEqual(observedSteps({},'trace',null),[])
})
test('failed backend observations stay failures and never enter successful history',async()=>{
 const h=harness(async(query,trace)=>{const error=new Error('quorum unavailable');error.response={rows:[],duration_ms:4,query_type:'select',coordinator_id:'coord-1',events:[{type:'query.complete',trace_id:trace,timestamp:new Date().toISOString(),metadata:{error:true}}]};throw error})
 await h.controller.startExecution('SELECT * FROM users')
 assert.equal(h.state.queryError,'quorum unavailable');assert.equal(h.state.queryResult,null);assert.equal(h.state.queryHistory.length,0)
 assert.equal(h.state.executionSteps.some(step=>step.label==='Backend query failed'&&step.error),true)
 assert.equal(h.state.isExecuting,false)
})
