import {investigate,ResearchError,type ResearchOptions} from './research.ts';
// Best-effort backpressure within one Worker isolate; no user records or database.
let active=0;
export async function researchResponse(request:Request,options:ResearchOptions={},research:typeof investigate=investigate){
 const headers={'Cache-Control':'no-store'};
 const fail=(error:string,status:number)=>Response.json({error},{status,headers});
 try{if(new URL(request.headers.get('origin')||'').origin!==new URL(request.url).origin)return fail('Use the research form on this site.',403);}catch{return fail('Use the research form on this site.',403);}
 if(!request.headers.get('content-type')?.includes('application/json'))return fail('Expected JSON.',415);
 if(Number(request.headers.get('content-length'))>2048)return fail('Request too large.',413);
 let body:{input?:unknown};
 try{const text=await request.text();if(text.length>2048)return fail('Request too large.',413);body=JSON.parse(text);}catch{return fail('Invalid request.',400);}
 if(!body||typeof body.input!=='string'||body.input.trim().length<2||body.input.length>240)return fail('Enter an app name or official website.',400);
 if(active>=4)return fail('Research is busy. Wait a moment and try again.',429);
 active++;
 const cancel=new AbortController();const signal=AbortSignal.any([request.signal,cancel.signal,AbortSignal.timeout(180000)]);
 const encoder=new TextEncoder();let open=true;
 const stream=new ReadableStream({async start(controller){
  const emit=(type:string,data:object)=>{if(open)try{controller.enqueue(encoder.encode(JSON.stringify({type,...data})+'\n'));}catch{open=false;}};
  try{const guide=await research(body.input as string,message=>emit('progress',{message}),signal,options);signal.throwIfAborted();emit('complete',{guide});}
  catch(error){emit('error',{message:signal.aborted?'Research timed out or was cancelled. Try the provider homepage or documentation URL.':error instanceof ResearchError?error.message:'Research could not complete. Try the provider homepage or documentation URL.'});}
  finally{active--;if(open){open=false;controller.close();}}
 },cancel(){open=false;cancel.abort();}});
 return new Response(stream,{headers:{...headers,'Content-Type':'application/x-ndjson; charset=utf-8','X-Content-Type-Options':'nosniff'}});
}
