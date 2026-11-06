"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, ChevronLeft, ChevronRight, ExternalLink, Search, X } from "lucide-react";
import { appDirectory, directoryCategories, directoryCollections, findDirectoryApps, type DirectoryApp } from "../lib/catalog/directory";
const PAGE_SIZE = 24;
function DirectoryCard({app,pinned,onPin,onResearch,onGuide}: {
  app:DirectoryApp; pinned:boolean; onPin:()=>void; onResearch:(input:string)=>void; onGuide:(id:string)=>void;
}) {
  const [variant,setVariant] = useState(app.variants[0].id);
  const selected = app.variants.find(v=>v.id===variant) || app.variants[0];
  return <article className="app-card directory-card">
    <div className="card-top">
      <span className="app-mark directory-mark" aria-hidden="true">{app.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0,2).toUpperCase()}</span>
      <span className={`directory-badge ${app.guideId ? "reviewed" : ""}`}>{app.guideId ? "Reviewed guide" : "Research available"}</span>
      <button className="bookmark-btn" aria-label={`${pinned ? "Unpin" : "Pin"} ${app.name}`} aria-pressed={pinned} onClick={onPin}><Bookmark size={16} fill={pinned ? "currentColor" : "none"}/></button>
    </div>
    <div className="app-card-title"><h3><button onClick={()=>app.guideId ? onGuide(app.guideId) : onResearch(selected.input)}>{app.name}</button></h3><span>{app.category}</span></div>
    <div className="directory-tags">{app.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
    <p className="card-summary">{app.guideId ? "A source-reviewed setup guide is ready. Inspect requirements and launch considerations." : "Explore the provider’s documentation and authentication options. OAuth support and setup requirements need research."}</p>
    {app.variants.length>1 && <label className="directory-variant"><span>Research starting point</span><select value={variant} onChange={e=>setVariant(e.target.value)} aria-label={`Research starting point for ${app.name}`}>{app.variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>}
    {app.guideId && <button className="text-link directory-guide" onClick={()=>onGuide(app.guideId!)}>View reviewed guide <ArrowRight size={13}/></button>}
    <div className="card-footer">
      {selected.url ? <a href={selected.url} target="_blank" rel="noreferrer">{/nango\.dev/.test(selected.url) ? "Discovery notes" : "Provider website / docs"} <ExternalLink size={12}/></a> : <span>Public documentation research</span>}
      <button onClick={()=>onResearch(selected.input)}>Research app <ArrowRight size={15}/></button>
    </div>
  </article>;
}
export function AppDirectory({onResearch,onGuide}:{onResearch:(input:string)=>void;onGuide:(id:string)=>void}) {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All categories");
  const [collection,setCollection]=useState("All platforms");
  const [mode,setMode]=useState("all");
  const [page,setPage]=useState(1);
  const [pins,setPins]=useState<string[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{try {
    const value:unknown=JSON.parse(localStorage.getItem("atlas:pinned-apps")||"[]");
    if(Array.isArray(value)) setPins(value.filter((id):id is string=>typeof id==="string" && appDirectory.some(app=>app.id===id)));
  } catch { /* Browsing works without local storage. */ }},[]);
  function togglePin(id:string) {
    const next=pins.includes(id)?pins.filter(p=>p!==id):[...pins,id];setPins(next);
    try{localStorage.setItem("atlas:pinned-apps",JSON.stringify(next));}
    catch{setMessage("Pins are available for this visit. Browser storage is unavailable.");}
  }
  function reset(){setQuery("");setCategory("All categories");setCollection("All platforms");setMode("all");setPage(1);}
  const results=findDirectoryApps(query,category,collection,mode,pins);
  const pages=Math.max(1,Math.ceil(results.length/PAGE_SIZE));
  const current=Math.min(page,pages);
  const visible=results.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
  return <div className="directory-browser">
    <div className="directory-tabs" role="group" aria-label="Library view">{[["all",`All apps · ${appDirectory.length}`],["reviewed",`Reviewed guides · ${appDirectory.filter(a=>a.guideId).length}`],["pinned",`Pinned apps · ${pins.length}`]].map(([id,label])=><button key={id} className={mode===id?"selected":""} aria-pressed={mode===id} onClick={()=>{setMode(id);setPage(1);}}>{label}</button>)}</div>
    <p className="directory-explainer"><b>Find a platform. Keep a shortlist. Research the connection.</b> “Research available” is a discovery starting point, not a verified OAuth integration. Pins stay on this device.</p>
    <div className="library-toolbar directory-toolbar">
      <label className="search-box"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Search apps, tools, categories, or ecosystems…" aria-label="Search app directory"/>{query&&<button aria-label="Clear directory search" onClick={()=>{setQuery("");setPage(1);}}><X size={14}/></button>}</label>
      <select aria-label="Filter app category" value={category} onChange={e=>{setCategory(e.target.value);setPage(1);}}><option>All categories</option>{directoryCategories.map(c=><option key={c}>{c}</option>)}</select>
      <select aria-label="Filter app collection" value={collection} onChange={e=>{setCollection(e.target.value);setPage(1);}}><option>All platforms</option>{directoryCollections.map(c=><option key={c}>{c}</option>)}</select>
    </div>
    <div className="directory-quick" role="group" aria-label="Quick collections">{directoryCollections.map(c=><button key={c} className={collection===c?"selected":""} aria-pressed={collection===c} onClick={()=>{setCollection(collection===c?"All platforms":c);setPage(1);}}>{c}</button>)}</div>
    <div className="directory-results" aria-live="polite"><span>{results.length?`${(current-1)*PAGE_SIZE+1}–${Math.min(current*PAGE_SIZE,results.length)} of ${results.length} apps`:"0 apps"}</span>{(query||category!=="All categories"||collection!=="All platforms"||mode!=="all")&&<button className="text-link" onClick={reset}>Reset filters</button>}</div>
    {message&&<p role="status">{message}</p>}
    <div className="app-grid">{visible.map(app=><DirectoryCard key={app.id} app={app} pinned={pins.includes(app.id)} onPin={()=>togglePin(app.id)} onResearch={onResearch} onGuide={onGuide}/>)}</div>
    {!results.length&&<div className="empty"><Search size={30}/><h3>{mode==="pinned"?"Build your own shortlist":"No apps match these filters"}</h3><p>{mode==="pinned"?"Pin apps in the directory to find them here later.":"Try a broader name or category, or research an app that is not listed yet."}</p><button className="secondary" onClick={reset}>Browse all apps</button>{mode!=="pinned"&&<button className="primary" onClick={()=>onResearch(query)}>Research {query||"an app"}<ArrowRight size={15}/></button>}</div>}
    {results.length>PAGE_SIZE&&<nav className="directory-pagination" aria-label="App directory pages"><button className="secondary" disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={15}/> Previous</button><span>Page {current} of {pages}</span><button className="secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Next <ChevronRight size={15}/></button></nav>}
  </div>;
}
