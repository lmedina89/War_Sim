import { createEntityId } from "../core/ids.js";
import { daysBetweenIso } from "./dateMath.js";
import { recordNotification } from "./recordServices.js";

function awardRecordsFor(draft,personId,awardId){return Object.values(draft.entities.awardRecords??{}).filter(r=>r.personId===personId&&r.awardId===awardId).sort((a,b)=>String(a.earnedDate??"").localeCompare(String(b.earnedDate??""))||a.id.localeCompare(b.id));}
function awardCount(draft,personId,awardId){return awardRecordsFor(draft,personId,awardId).length;}

export function grantAwardInDraft(draft,registries,{personId,awardId,sourceType,sourceId=null,reason=null,allowDuplicate=false}){
  const person=draft.entities.people[personId]; if(!person) return null;
  const def=registries.awards.get(awardId); const existing=awardRecordsFor(draft,personId,awardId);
  if(existing.length && def.repeatable!==true && !allowDuplicate) return null;
  const id=createEntityId(draft,"award");
  draft.entities.awardRecords[id]={id,schemaVersion:3,personId,awardId,earnedDate:draft.world.date,sourceType,sourceId,reason};
  person.career.prestige=(person.career.prestige??0)+(def.prestigeValue??0);
  const ordinal=existing.length+1;
  const notificationId=recordNotification(draft,{personId,type:"award_earned",title:"Award Earned",message:`${def.name}${ordinal>1?` · ${ordinal} awards total`:""}${reason?` — ${reason}`:""}`,priority:"high",references:{awardId,awardRecordId:id}});
  return {awardRecordId:id,notificationId,awardId,awardCount:ordinal};
}

export function evaluateServiceAwardsInDraft(draft,registries,personId){
  const person=draft.entities.people[personId], created=[]; if(!person||person.condition?.status!=="active") return created;
  const service=draft.entities.serviceRecords?.[person.serviceRecordId];
  const entryDate=service?.entryDate??person.career?.enlistmentDate; if(!entryDate) return created;
  const serviceDays=Math.max(0,daysBetweenIso(entryDate,draft.world.date));
  const rank=registries.ranks.get(person.affiliation.rankId);
  if(rank.category==="enlisted"){
    const earned=Math.floor(serviceDays/1095); const current=awardCount(draft,personId,"award_army_good_conduct_medal");
    for(let i=current;i<earned;i++){const result=grantAwardInDraft(draft,registries,{personId,awardId:"award_army_good_conduct_medal",sourceType:"qualifying_enlisted_service",sourceId:`service_block_${i+1}`,reason:"Three years of qualifying active enlisted service."});if(result)created.push(result);}
  }
  return created;
}

export function evaluateCommendationAwardsInDraft(draft,registries,personId){
  const records=Object.values(draft.entities.performanceRecords??{}).filter(r=>r.personId===personId&&Number.isFinite(r.score));
  const excellent=records.filter(r=>r.score>=90).length, superior=records.filter(r=>r.score>=96).length;
  const created=[];
  const aamTarget=Math.floor(excellent/8); const aamCurrent=awardCount(draft,personId,"award_army_achievement_medal");
  for(let i=aamCurrent;i<aamTarget;i++){const result=grantAwardInDraft(draft,registries,{personId,awardId:"award_army_achievement_medal",sourceType:"sustained_performance",sourceId:`excellent_performance_${(i+1)*8}`,reason:"Sustained excellent duty and training performance."});if(result)created.push(result);}
  const arcomTarget=Math.floor(superior/24); const arcomCurrent=awardCount(draft,personId,"award_army_commendation_medal");
  for(let i=arcomCurrent;i<arcomTarget;i++){const result=grantAwardInDraft(draft,registries,{personId,awardId:"award_army_commendation_medal",sourceType:"sustained_superior_performance",sourceId:`superior_performance_${(i+1)*24}`,reason:"Sustained superior performance over an extended period."});if(result)created.push(result);}
  return created;
}
