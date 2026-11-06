import test from "node:test";
import assert from "node:assert/strict";
import snapshot from "../data/provider-discovery.json" with { type: "json" };
import {appDirectory,directoryCategories,findDirectoryApps} from "../lib/app-directory.ts";
import {catalog} from "../lib/catalog.ts";

test("the library retains every discovery starting point while grouping authentication variants",()=>{
  assert.ok(appDirectory.length>800);
  const ids=appDirectory.flatMap(app=>app.variants.map(v=>v.id));
  for(const id of Object.keys(snapshot.providers)) assert.ok(ids.includes(id),id);
  assert.equal(new Set(appDirectory.map(app=>app.id)).size,appDirectory.length);
  assert.ok(appDirectory.length<Object.keys(snapshot.providers).length);
});
test("only existing reviewed guides receive a reviewed guide action",()=>{
  const reviewed=findDirectoryApps("","All categories","All platforms","reviewed");
  assert.deepEqual(reviewed.map(a=>a.guideId).sort(),catalog.map(g=>g.id).sort());
  assert.equal(findDirectoryApps("Cashfree")[0]?.guideId,undefined);
});
test("categories and regional collections cover different product families",()=>{
  assert.ok(directoryCategories.length>=20);
  const indian=findDirectoryApps("","All categories","Indian platforms");
  for(const name of ["DigiLocker","Upstox","Razorpay","Zoho CRM","MSG91"]) assert.ok(indian.some(a=>a.name.toLowerCase()===name.toLowerCase()),name);
  assert.ok(!indian.some(a=>a.name==="FreshBooks"));
  assert.ok(findDirectoryApps("","Cloud & infrastructure").some(a=>a.name.startsWith("AWS")));
});
test("multiword search locates variants and category terms together",()=>{
  const github=findDirectoryApps("github personal");
  assert.ok(github.some(a=>a.guideId==="github"));
  const paymentApps=findDirectoryApps("payments");
  assert.ok(paymentApps.some(a=>a.name==="Razorpay"));
  assert.equal(findDirectoryApps("a-product-that-is-not-in-this-directory").length,0);
});
test("pinned view selects only the requested current app identifiers",()=>{
  const pins=["github","digilocker","unknown-id"];
  assert.deepEqual(findDirectoryApps("","All categories","All platforms","pinned",pins).map(a=>a.id).sort(),["digilocker","github"]);
  assert.equal(findDirectoryApps("","All categories","All platforms","pinned",[]).length,0);
});
test("each research action has a distinct usable starting point and safe discovery links",()=>{
  for(const app of appDirectory){
    assert.ok(app.variants.length>0,app.name);
    assert.equal(new Set(app.variants.map(v=>v.id)).size,app.variants.length,app.name);
    for(const variant of app.variants){
      assert.ok(variant.input.length>=2,app.name);
      if(variant.url){const u=new URL(variant.url);assert.equal(u.protocol,"https:",app.name);assert.equal(u.username,"");assert.equal(u.password,"");}
    }
  }
});
