import test from 'node:test';
import assert from 'node:assert/strict';
import {researchResponse} from '../lib/research-api.ts';
import {investigate} from '../lib/research.ts';
import {catalog} from '../lib/catalog.ts';
const request=(body:unknown,origin='https://atlas.test')=>new Request('https://atlas.test/api/research',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const fake:typeof investigate=async(_input,progress)=>{progress('Inspecting documentation');return catalog[0];};
test('database-free research streams progress and the complete report without sign-in',async()=>{
 const r=await researchResponse(request({input:'New provider'}),{},fake);assert.equal(r.status,200);
 const frames=(await r.text()).trim().split('\n').map(x=>JSON.parse(x));
 assert.equal(frames[0].type,'progress');assert.equal(frames.at(-1).type,'complete');assert.equal(frames.at(-1).guide.id,catalog[0].id);
 assert.equal(r.headers.get('cache-control'),'no-store');
});
test('invalid origins, malformed JSON, oversized bodies and empty input cannot start research',async()=>{
 let started=false;const noCall:typeof investigate=async()=>{started=true;return catalog[0];};
 const cases:[Request,number][]=[[request({input:'test'},'https://other.test'),403],[request({input:'test'},'invalid'),403],[request({input:'x'}),400],[request(null),400],[request({input:'x'.repeat(2200)}),413],[new Request('https://atlas.test/api/research',{method:'POST',headers:{Origin:'https://atlas.test','Content-Type':'application/json'},body:'{'}),400]];
 for(const [req,status] of cases)assert.equal((await researchResponse(req,{},noCall)).status,status);
 assert.equal(started,false);
});
test('research failure emits an error rather than a completed report',async()=>{
 const fail:typeof investigate=async()=>{throw new Error('private internals');};
 const r=await researchResponse(request({input:'Provider'}),{},fail);const output=await r.text();assert.match(output,/"type":"error"/);assert.doesNotMatch(output,/"type":"complete"|private internals/);
});
test('isolate backpressure releases capacity after cancellation',async()=>{
 const controllers=Array.from({length:4},()=>new AbortController());
 const blocked:typeof investigate=async(_input,_progress,signal)=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
 const runs=await Promise.all(controllers.map(c=>{const r=request({input:'Provider'});return researchResponse(new Request(r,{signal:c.signal}),{},blocked);}));
 assert.equal((await researchResponse(request({input:'Another'}),{},fake)).status,429);
 controllers.forEach(c=>c.abort());await Promise.all(runs.map(r=>r.text()));
 const next=await researchResponse(request({input:'Retry'}),{},fake);assert.equal(next.status,200);await next.text();
});
test('reviewed guides preserve source references, responsibility and honest estimate labels',()=>{
 for(const g of catalog){const ids=new Set(g.sources.map(s=>s.id));assert.ok(g.sources.length>0);assert.ok(g.effortNote);assert.ok(g.waitNote);assert.ok(g.human.length);for(const s of [...g.steps,...g.blockers]){if(s.level==='documented')assert.ok(s.sources.length,`${g.name}: ${s.title}`);for(const id of s.sources)assert.ok(ids.has(id),`${g.name}: missing source ${id}`);}}
});
