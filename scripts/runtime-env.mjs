import {mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const runtime=path.join(root,".runtime");
for(const [name,folder] of Object.entries({WRANGLER_LOG_PATH:"logs",WRANGLER_REGISTRY_PATH:"dev-registry",MINIFLARE_REGISTRY_PATH:"registry"})){
  process.env[name]??=path.join(runtime,folder);
  mkdirSync(process.env[name],{recursive:true});
}
process.env.WRANGLER_SEND_METRICS??="false";
process.env.CLOUDFLARE_CF_FETCH_ENABLED??="false";
