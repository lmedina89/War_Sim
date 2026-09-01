import assert from "node:assert/strict";
import fs from "node:fs";
import { createConfirmDialogController } from "../src/ui/dialogs/confirmDialog.js";
import { createAchievementDialogController } from "../src/ui/dialogs/achievementDialog.js";
import { createResultDialogController } from "../src/ui/dialogs/resultDialog.js";

for (const file of ["confirmDialog.js","achievementDialog.js","resultDialog.js"]) {
  const source=fs.readFileSync(new URL(`../src/ui/dialogs/${file}`,import.meta.url),"utf8");
  assert.doesNotMatch(source,/from\s+["']\.\.\/\.\.\/(?:commands|services|state|core|selectors)\//,`${file} must not import canonical game layers directly`);
  assert.doesNotMatch(source,/\.innerHTML\s*=/,`${file} must not use innerHTML assignment`);
}

class FakeElement {
  constructor(tag="div"){this.tagName=tag;this.children=[];this.listeners={};this.className="";this.textContent="";this.open=false;this.returnValue="";this.dataset={};}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]??[]).filter(item=>item!==fn);}
  showModal(){this.open=true;}
  close(){this.open=false;for(const fn of [...(this.listeners.close??[])]) fn();}
  async click(){for(const fn of this.listeners.click??[]) await fn();}
  get childElementCount(){return this.children.length;}
}
const previousDocument=globalThis.document;
globalThis.document={createElement:tag=>new FakeElement(tag)};
try {
  // Confirmation dialog preserves the native dialog returnValue contract.
  const confirmEls={dialog:new FakeElement("dialog"),title:new FakeElement(),message:new FakeElement()};
  const confirmation=createConfirmDialogController({elements:confirmEls});
  const pending=confirmation.confirm("Proceed?","Confirm action");
  assert.equal(confirmEls.dialog.open,true); assert.equal(confirmEls.title.textContent,"Proceed?");
  confirmEls.dialog.returnValue="confirm"; confirmEls.dialog.close();
  assert.equal(await pending,true);

  // Achievement queue filters routine notices, marks displayed notices read, and follows opportunity references.
  const achievementEls={dialog:new FakeElement("dialog"),type:new FakeElement(),title:new FakeElement(),message:new FakeElement(),ok:new FakeElement("button")};
  const notices={routine:{id:"routine",type:"routine",title:"Routine",message:"x",references:{}},award:{id:"award",type:"award_earned",title:"Badge Earned",message:"Awarded",references:{opportunityRecordId:"opp_1"}}};
  const marked=[],opened=[];
  const achievement=createAchievementDialogController({elements:achievementEls,getNoticesByIds:ids=>ids.map(id=>notices[id]).filter(Boolean),markRead:id=>marked.push(id),openOpportunity:id=>opened.push(id),defer:fn=>fn()});
  achievement.enqueue(["routine","award"]);
  assert.equal(achievementEls.dialog.open,true); assert.equal(achievementEls.title.textContent,"Badge Earned"); assert.equal(achievementEls.ok.textContent,"Open Opportunity"); assert.equal(achievement.pendingCount(),0);
  await achievementEls.ok.click();
  assert.deepEqual(marked,["award"]); assert.deepEqual(opened,["opp_1"]); assert.equal(achievementEls.dialog.open,false);

  // Result dialog exercises command, focused-activity, and scheduled-duty presentation without owning canonical state.
  const resultEls={dialog:new FakeElement("dialog"),reference:new FakeElement(),kicker:new FakeElement(),title:new FakeElement(),body:new FakeElement()};
  const metric=(label,value)=>{const el=new FakeElement();el.textContent=`${label}:${value}`;return el;};
  const resultState={entities:{
    activityRecords:{activity_1:{id:"activity_1",activityDefinitionId:"activity_pt",performanceRating:"satisfactory",performanceScore:82,startDate:"2046-01-01",endDate:"2046-01-01",personId:"p1",sourceType:"player_activity",participantScope:"individual",participantPersonIds:["p1"],before:{readiness:80,skills:{skill_1:10}},after:{readiness:82,skills:{skill_1:11}},deltas:{readiness:2,skills:{skill_1:1}},repetitionMultiplier:1}},
    scheduleRecords:{duty_1:{id:"duty_1",dutyDefinitionId:"duty_pt",performanceRating:"satisfactory",performanceScore:80,startDate:"2046-01-02",endDate:"2046-01-02",participantPersonIds:["p1","p2"],before:{readiness:80,morale:80,fatigue:5,unitReadiness:80,unitCohesion:80,training:{collective:10}},after:{readiness:82,morale:81,fatigue:7,unitReadiness:81,unitCohesion:81,training:{collective:11}}}},
    gameplayEventRecords:{}
  }};
  const result=createResultDialogController({
    elements:resultEls,getState:()=>resultState,
    getActivityDefinition:()=>({name:"Physical Training"}),getDutyDefinition:()=>({name:"Unit PT"}),getSkillName:()=>"Marksmanship",getGameplayEventDefinition:()=>null,getPerformanceRatingLabel:()=>"Satisfactory",
    performanceProfile:()=>({tone:"routine",label:"Satisfactory",description:"OK"}),feedbackProfile:()=>({tone:"routine",label:"EVENT"}),compactReference:(prefix)=>`${prefix}-REF`,recordReference:()=>"AAR-REF",statusStamp:()=>new FakeElement(),metricBlock:metric,
  });
  result.showCommandResult({code:"time_advanced",data:{startDate:"2046-01-01",endDate:"2046-01-02",days:1,summaryItems:[{label:"Routine day",tone:"routine"}]}});
  assert.equal(resultEls.dialog.open,true); assert.equal(resultEls.kicker.textContent,"TIME ADVANCE SUMMARY"); assert.equal(resultEls.title.textContent,"1 Day Advanced"); assert.equal(resultEls.body.children.length,2);
  resultEls.dialog.open=false; result.showActivity("activity_1");
  assert.equal(resultEls.dialog.open,true); assert.equal(resultEls.kicker.textContent,"AFTER ACTION REPORT"); assert.equal(resultEls.title.textContent,"Physical Training");
  resultEls.dialog.open=false; result.showDuty("duty_1");
  assert.equal(resultEls.dialog.open,true); assert.equal(resultEls.kicker.textContent,"UNIT TRAINING AAR"); assert.equal(resultEls.title.textContent,"Unit PT");
  resultEls.dialog.open=false; result.showCommandResult({code:"decision_resolved",message:"Helped teammate",data:{eventRecordId:"ev1",title:"Leadership Moment",choiceLabel:"Coach Teammate",targetPersonName:"PFC Test",changes:[{label:"Morale",before:80,after:82,delta:2}]}});
  assert.equal(resultEls.dialog.open,true); assert.equal(resultEls.kicker.textContent,"DECISION OUTCOME"); assert.equal(resultEls.title.textContent,"Leadership Moment");
} finally { globalThis.document=previousDocument; }

console.log("War Sim dialog controller extraction QA passed");
