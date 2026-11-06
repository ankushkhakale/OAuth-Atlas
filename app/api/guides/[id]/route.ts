import {catalog} from '../../../../lib/catalog/guides';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const guide=catalog.find(g=>g.id===id);
 return Response.json(guide?{guide}:{error:'This research report is saved only in the browser where it was created. Open My guides there, or research this app again.'},{status:guide?200:404,headers:{'Cache-Control':'no-store'}});
}
