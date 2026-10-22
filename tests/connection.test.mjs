import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTs} from './load-ts.mjs'
const {createEventConnection}=await loadTs('src/services/eventConnection.ts')
test('unmount and obsolete socket callbacks cannot reconnect or replace the new connection',()=>{
  const sockets=[],timers=new Map(),received=[];let next=0
  const connection=createEventConnection({socket:()=>{const socket={readyState:1,onopen:null,onmessage:null,onclose:null,onerror:null,close(){this.onclose?.()}};sockets.push(socket);return socket},receive:value=>received.push(value),schedule:callback=>{timers.set(++next,callback);return next},cancel:id=>timers.delete(id),random:()=>0})
  connection.connect();connection.connect();assert.equal(sockets.length,1)
  const oldClose=sockets[0].onclose,oldMessage=sockets[0].onmessage
  connection.disconnect();assert.equal(timers.size,0)
  connection.connect();oldClose();oldMessage({data:'{"obsolete":true}'});assert.equal(timers.size,0);assert.deepEqual(received,[])
  sockets[1].onmessage({data:'not JSON'});sockets[1].onmessage({data:'{"current":true}'});assert.deepEqual(received,[{current:true}])
  sockets[1].onclose();assert.equal(timers.size,1);connection.disconnect();assert.equal(timers.size,0)
})
