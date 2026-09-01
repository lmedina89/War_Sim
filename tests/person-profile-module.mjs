import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPersonProfileController } from "../src/ui/dialogs/personProfile.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app=fs.readFileSync(path.join(root,"src/app.js"),"utf8");
const source=fs.readFileSync(path.join(root,"src/ui/dialogs/personProfile.js"),"utf8");

assert.match(app,/createPersonProfileController/);
assert.match(app,/getPersonProfileContext/);
assert.match(app,/personProfile\.open\(personId\)/);
assert.doesNotMatch(source,/from\s+["']\.\.\/\.\.\/(?:commands|services|state|core|selectors)\//,"Personnel Profile must not import canonical game layers directly");
assert.doesNotMatch(source,/localStorage|sessionStorage/,"Personnel Profile must use injected UI archive helpers");
assert.doesNotMatch(source,/\.innerHTML\s*=/,"Personnel Profile must not use innerHTML assignment");
for(const expected of ["dog-tag-rank-insignia","Education, Qualifications & Awards","person-career-activity","simulationTierLabel","View Uniform","Open Unit"]) assert.match(source,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));

let closes=0;
const controller=createPersonProfileController({
  els:{personDialog:{close(){closes++;}}},
  getProfileContext:()=>null,
  createProfileUniform(){},createRankInsignia(){},statLine(){},progressRow(){},statusStamp(){},metricBlock(){},recordReference(){},
  readUiArchive(){return new Set();},writeUiArchive(){},onOpenUnit(){}
});
assert.equal(controller.open("missing-person"),undefined,"unknown personnel must remain a harmless no-op");
controller.close();
assert.equal(closes,1,"close delegates to the existing personnel dialog");

console.log("War Sim Personnel Profile module extraction QA passed");

// Exercise the extracted presentation path with a minimal DOM contract and an empty service record.
class FakeElement {
  constructor(tag="div"){this.tagName=tag;this.children=[];this.listeners={};this.className="";this.hidden=false;this.textContent="";this.classList={add:(...names)=>{this.className=[this.className,...names].filter(Boolean).join(" ");}};}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  setAttribute(name,value){this[name]=String(value);}
}
const previousDocument=globalThis.document;
globalThis.document={createElement:tag=>new FakeElement(tag)};
try {
  const dialog={shown:0,closed:0,showModal(){this.shown++;},close(){this.closed++;}};
  const els={
    personDialog:dialog,
    personProfileAuthority:new FakeElement(),personProfileRef:new FakeElement(),personProfileName:new FakeElement(),
    personDogTag:new FakeElement(),personProfileBreadcrumbs:new FakeElement(),personProfileBody:new FakeElement()
  };
  const person={id:"person_1",identity:{displayName:"Test Soldier"},affiliation:{unitId:"unit_1"},condition:{status:"active",readiness:90,morale:80,health:100,fatigue:10},career:{experience:12,prestige:3},simulationTier:1};
  const context={state:{playerPersonId:"person_1"},indexes:{},person,rank:{abbreviation:"PFC",name:"Private First Class",payGrade:"E-3"},billetDef:{name:"Rifleman"},unit:{name:"1st Squad"},branch:{name:"Army"},specialty:{code:"11B",name:"Infantryman"},assignment:{chain:[{name:"1st Squad",unitId:"unit_1",formationName:"1st Platoon"}]},career:{education:[],qualifications:[],awards:[]},primary:null,equipment:null,gameplay:{skills:[],recentCareerActivity:[],simulationTierLabel:"Tier 1",simulationTierDescription:"Detailed"},getAwardDefinition(){return null;}};
  const makeLine=(label,value)=>{const el=new FakeElement();el.textContent=`${label}:${value}`;return el;};
  const rendered=createPersonProfileController({
    els,getProfileContext:id=>id==="person_1"?context:null,createProfileUniform(){throw new Error("player profile must not create NPC uniform");},
    createRankInsignia:()=>new FakeElement("svg"),statLine:makeLine,progressRow:makeLine,statusStamp:()=>new FakeElement(),metricBlock:makeLine,recordReference:()=>"PERS-1",
    readUiArchive:()=>new Set(),writeUiArchive(){},onOpenUnit(){},raf:fn=>fn(),win:{scrollY:0,scrollTo(){}}
  });
  rendered.open("person_1");
  assert.equal(dialog.shown,1);
  assert.equal(els.personProfileName.textContent,"PFC Test Soldier · YOU");
  assert.equal(els.personProfileAuthority.textContent,"ARMY PERSONNEL COMMAND");
  assert.equal(els.personProfileRef.textContent,"PERS-1");
  assert.equal(els.personProfileBody.children.length,7,"profile body keeps the existing section contract for the player");
} finally {
  globalThis.document=previousDocument;
}
