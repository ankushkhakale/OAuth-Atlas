import {investigate} from '../lib/research/engine.ts';
import {writeFileSync,mkdirSync} from 'node:fs';
const inputs=['https://linear.app/developers/oauth-2-0-authentication','https://www.zoho.com/accounts/protocol/oauth.html','https://www.duolingo.com'];
mkdirSync('docs/evidence',{recursive:true});
const results=await Promise.all(inputs.map(async input=>{
 const started=Date.now();try{const g=await investigate(input,()=>{},AbortSignal.timeout(105000),{maxDocuments:8,maxRequests:20});return {input,elapsedMs:Date.now()-started,status:g.research?.status,supported:g.supported,coverage:g.research?.coverage,documents:g.research?.documents,requests:g.research?.requests,sources:g.sources.map(s=>({title:s.title,url:s.url})),attempts:g.research?.attempts};}catch(e){return {input,elapsedMs:Date.now()-started,error:e instanceof Error?e.message:String(e)};}
}));
writeFileSync('docs/evidence/final-live-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),environment:'Node public retrieval, not browser or hosted Worker',results},null,2)+'\n');
for(const {attempts,...r} of results)console.log(JSON.stringify(r));
