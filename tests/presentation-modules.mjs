import assert from "node:assert/strict";
import fs from "node:fs";
import { createPresentationToolkit } from "../src/ui/presentation.js";
import { createRelationshipsRenderer } from "../src/ui/render/relationships.js";
import { createInboxRenderer } from "../src/ui/render/inbox.js";
import { createHistoryArchiveController } from "../src/ui/historyArchive.js";

class FakeClassList {
  constructor(owner){this.owner=owner;}
  add(...values){const set=new Set((this.owner.className||"").split(/\s+/).filter(Boolean));for(const value of values)set.add(value);this.owner.className=[...set].join(" ");}
}
class FakeStyle { constructor(){this.values=new Map();} setProperty(k,v){this.values.set(k,v);} }
class FakeElement {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes=new Map();this.listeners={};this.style=new FakeStyle();this.classList=new FakeClassList(this);this.className="";this.textContent="";this.type="";}
  append(...children){this.children.push(...children);}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(k,v){this.attributes.set(k,String(v));}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  click(){for(const fn of this.listeners.click??[])fn();}
}
const originalDocument=globalThis.document;
globalThis.document={createElement:tag=>new FakeElement(tag)};
try {
  const registries={
    ranks:{get:id=>({abbreviation:id==="r"?"SGT":"?",name:"Sergeant"})},
    branches:{get:()=>({name:"Army"})},
    performanceRatings:{has:id=>id==="excellent",get:id=>({id,label:id})},
    feedbackPresentations:{has:id=>id==="f",get:id=>({id})},
    statusPresentations:{has:id=>id==="active",get:id=>({id,label:"ACTIVE",tone:"good"})},
    documentPresentations:{get:id=>({prefix:id==="notification"?"MSG":"REC"})},
  };
  const ui=createPresentationToolkit(registries);
  assert.equal(ui.resolveRankName("r"),"SGT · Sergeant");
  assert.equal(ui.resolveBranchName("b"),"Army");
  assert.equal(ui.statusProfile("active").label,"ACTIVE");
  assert.equal(ui.statusProfile("in_progress").label,"IN PROGRESS");
  assert.match(ui.recordReference("notification","abc"),/^MSG-[A-Z0-9]{7}$/);
  assert.equal(ui.formatMilitaryDate("2026-09-01"),"01 SEP 2026");
  const metric=ui.metricBlock("WHY EARNED","Completed initial entry training","durable provenance");
  assert.equal(metric.className,"mil-metric");
  assert.equal(metric.children[1].textContent,"Completed initial entry training");
  const progress=ui.progressRow("Promotion",50,100);
  assert.equal(progress.children[1].attributes.get("aria-valuenow"),"50");
  assert.equal(progress.children[1].children[0].style.values.get("--progress"),"50%");

  const bands={values:()=>[{minimumTrust:-100,maximumTrust:24,tone:"routine",label:"Neutral"},{minimumTrust:25,maximumTrust:100,tone:"good",label:"Trusted"}],get:()=>({tone:"routine",label:"Neutral"})};
  const container=new FakeElement("div");let opened=null;
  const renderRelationships=createRelationshipsRenderer({container,relationshipBands:bands,onOpenPerson:id=>{opened=id;}});
  renderRelationships([{otherPersonId:"p2",otherRank:"SGT",otherName:"Taylor",otherRole:"Team Leader",relationshipType:"Squad",trust:40,respect:30,rapport:20,personalityTraits:["calm"],memories:[]}]);
  assert.equal(container.children.length,1);
  assert.match(container.children[0].className,/tone-good/);
  container.children[0].click();
  assert.equal(opened,"p2");

  const inboxElements={
    unreadBadge:new FakeElement("span"),navCareerBadge:new FakeElement("span"),careerTabInboxBadge:new FakeElement("span"),
    markAllRead:new FakeElement("button"),clearRead:new FakeElement("button"),careerInbox:new FakeElement("div"),
  };
  let acknowledged=null,archived=null,openedOpportunity=null,quietRead=null;
  const renderInbox=createInboxRenderer({
    elements:inboxElements,recordReference:()=>"MSG-TEST001",
    onOpenOpportunity:id=>{openedOpportunity=id;},onAcknowledge:id=>{acknowledged=id;},onArchive:id=>{archived=id;},onMarkReadQuiet:id=>{quietRead=id;},
  });
  const inboxState={entities:{opportunityRecords:{opp1:{id:"opp1"}}}};
  renderInbox({state:inboxState,pendingDecisionCount:1,notices:[{id:"n1",readAtElapsedDay:null,type:"career_opportunity",gameDate:"2040-01-01",title:"School",message:"Opportunity available",references:{opportunityRecordId:"opp1"}}]});
  assert.equal(inboxElements.unreadBadge.hidden,false);
  assert.equal(inboxElements.navCareerBadge.textContent,"2");
  const dispatch=inboxElements.careerInbox.children[0].children[0];
  const dispatchActions=dispatch.children.at(-1);
  dispatchActions.children[0].click();
  assert.equal(quietRead,"n1");assert.equal(openedOpportunity,"opp1");
  dispatchActions.children[1].click();
  assert.equal(acknowledged,"n1");
  renderInbox({state:inboxState,pendingDecisionCount:0,notices:[{id:"n2",readAtElapsedDay:5,type:"general",gameDate:"2040-01-02",title:"Read",message:"Archived next",references:{}}]});
  inboxElements.careerInbox.children[0].children[0].children.at(-1).children[0].click();
  assert.equal(archived,"n2");

  const memory=new Map();
  const storage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,String(v))};
  let changes=0;
  const archive=createHistoryArchiveController({storage,onChange:()=>changes++});
  archive.archiveRecords("activity","p1",["a1","a2"]);
  assert.deepEqual([...archive.read("activity","p1")].sort(),["a1","a2"]);
  assert.equal(changes,1);
  archive.clear("activity","p1");
  assert.equal(archive.read("activity","p1").size,0);
  assert.equal(changes,2);
  const controls=archive.createControls({kind:"activity",personId:"p1",hiddenCount:2,archivedCount:1,expanded:false,onToggle:()=>{}});
  assert.equal(controls.children[0].textContent,"Show More (2)");
  assert.equal(controls.children[1].textContent,"Restore Archived (1)");

  const sources=["../src/ui/presentation.js","../src/ui/render/relationships.js","../src/ui/render/inbox.js","../src/ui/historyArchive.js"].map(rel=>fs.readFileSync(new URL(rel,import.meta.url),"utf8"));
  for(const source of sources){
    assert.doesNotMatch(source,/from\s+["']\.\.\/commands\//);
    assert.doesNotMatch(source,/from\s+["']\.\.\/services\//);
    assert.doesNotMatch(source,/\.innerHTML\s*=/);
  }
} finally {
  globalThis.document=originalDocument;
}
console.log("War Sim presentation/history module QA passed");
