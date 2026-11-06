import {env} from 'cloudflare:workers';
import {researchResponse} from '../../../lib/research/http';
export function POST(request:Request){return researchResponse(request,{ollamaURL:env.OLLAMA_URL,model:env.OLLAMA_MODEL,searxngURL:env.SEARXNG_URL});}
