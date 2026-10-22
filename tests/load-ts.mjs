import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const urls = new Map()
async function moduleURL(filename) {
  const full = path.resolve(root, filename)
  if (!urls.has(full)) urls.set(full, (async () => {
    let source = fs.readFileSync(full, 'utf8').replaceAll('import.meta.env', '{}')
    let js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
    const imports = [...js.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)]
    for (const match of imports) {
      const name = match[1]
      let url
      if (name.startsWith('@/') || name.startsWith('.')) {
        let target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(full), name)
        if (!path.extname(target)) target += '.ts'
        url = await moduleURL(target)
      } else url = import.meta.resolve(name)
      js = js.replaceAll(`'${name}'`, `'${url}'`).replaceAll(`"${name}"`, `"${url}"`)
    }
    return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  })())
  return urls.get(full)
}
export const loadTs = async filename => import(await moduleURL(filename))
export const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b}); return {promise,resolve,reject} }
export const snapshot = (id = 'coord-2') => ({
  observed_at: new Date().toISOString(), coordinator: {id,address:'localhost:9002',port:9002,healthy:true},
  coordinators:[{id,address:'localhost:9002',port:9002,healthy:true}],
  nodes:[{id:'node-a',address:'localhost:5001',alive:true,is_leader:true,shard_count:1}],
  shards:[{id:0,leader:'node-a',replicas:['node-a','missing-peer']}], shard_raft_detail:[], metadata_cluster:null,
  metrics:{query_count:0,avg_latency_ms:null,nodes_alive:1,nodes_total:1,shard_count:1,replication_factor:2},buckets:16,
})
export const recoverySnapshot = () => ({
  observed_at:new Date().toISOString(),metadata_quorum:'confirmed',desired_coordinators:2,desired_metadata:3,
  targets:[...['meta1','meta2','meta3'].map(id=>({id,role:'metadata'})),...['coord-1','coord-2'].map(id=>({id,role:'coordinator'}))].map(target=>({...target,mode:'automatic',phase:'healthy',live:true,ready:true,attempts:0,observed_at:new Date().toISOString()})),
})
