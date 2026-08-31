import { createEntityId } from "../core/ids.js";
import { randomInt, seedFromText } from "../core/rng.js";
import { recordNotification } from "./recordServices.js";
import { recordUnitEvent } from "./livingUnit.js";

function localRng(worldSeed, personId) {
  const seed=seedFromText(`${worldSeed}|${personId}|personality-v1`);
  return { world:{ seed, rngState:seed } };
}
function rankLevel(registries, person) { return registries.ranks.get(person.affiliation.rankId).hierarchyLevel; }
function sameUnitRelationships(draft, personId, unitId) {
  return Object.values(draft.entities.relationshipRecords ?? {}).filter(rel => {
    if (rel.personAId !== personId && rel.personBId !== personId) return false;
    const otherId=rel.personAId===personId?rel.personBId:rel.personAId;
    return draft.entities.people?.[otherId]?.affiliation?.unitId===unitId;
  }).sort((a,b)=>a.id.localeCompare(b.id));
}
function otherPersonId(rel, personId){ return rel.personAId===personId?rel.personBId:rel.personAId; }

export function seedPersonalityProfiles(state, registries) {
  state.entities.personalityProfiles ??= {};
  const defs=registries.personalities.values().sort((a,b)=>a.id.localeCompare(b.id));
  for (const person of Object.values(state.entities.people ?? {}).sort((a,b)=>a.id.localeCompare(b.id))) {
    if (state.entities.personalityProfiles[`personality_${person.id}`]) continue;
    const rng=localRng(state.world.seed,person.id);
    const count=randomInt(rng,1,2);
    const pool=[...defs], traitIds=[];
    for(let i=0;i<count&&pool.length;i++){
      const index=randomInt(rng,0,pool.length-1); traitIds.push(pool.splice(index,1)[0].id);
    }
    state.entities.personalityProfiles[`personality_${person.id}`]={ id:`personality_${person.id}`,schemaVersion:1,personId:person.id,traitIds,seedVersion:1 };
  }
}

export function recordRelationshipMemory(draft, { personId, otherPersonId, type, summary, sourceType="gameplay_event", sourceId=null, trustDelta=0, respectDelta=0, rapportDelta=0 }) {
  if (!personId || !otherPersonId || personId===otherPersonId) return null;
  draft.entities.relationshipMemoryRecords ??= {};
  const id=createEntityId(draft,"relmem");
  draft.entities.relationshipMemoryRecords[id]={id,schemaVersion:1,personId,otherPersonId,type,summary,gameDate:draft.world.date,elapsedDay:draft.world.clock.elapsedDays,sourceType,sourceId,trustDelta,respectDelta,rapportDelta};
  return id;
}

function recentPerformanceAverage(draft, personId, days=30) {
  const now=draft.world.clock.elapsedDays;
  const rows=Object.values(draft.entities.performanceRecords ?? {}).filter(r=>r.personId===personId && Number.isFinite(r.score)).filter(r=>{
    const activity=r.sourceId?draft.entities.activityRecords?.[r.sourceId]:null;
    const elapsed=activity?.endElapsedDay;
    return !Number.isInteger(elapsed) || now-elapsed<=days;
  }).slice(-6);
  return rows.length?Math.round(rows.reduce((sum,r)=>sum+r.score,0)/rows.length):null;
}

function chooseRelationship(draft, registries, personId, unitId, mode) {
  const rels=sameUnitRelationships(draft,personId,unitId);
  if(!rels.length)return null;
  let candidates=rels;
  if(mode==="leader"){
    const player=draft.entities.people[personId], playerLevel=rankLevel(registries,player);
    const leaders=rels.filter(rel=>rankLevel(registries,draft.entities.people[otherPersonId(rel,personId)])>playerLevel);
    if(leaders.length)candidates=leaders;
  } else if(mode==="peer") {
    const playerLevel=rankLevel(registries,draft.entities.people[personId]);
    const peers=rels.filter(rel=>Math.abs(rankLevel(registries,draft.entities.people[otherPersonId(rel,personId)])-playerLevel)<=1);
    if(peers.length)candidates=peers;
  }
  const weighted=[];
  for(const rel of candidates){
    const otherId=otherPersonId(rel,personId), profile=draft.entities.personalityProfiles?.[`personality_${otherId}`];
    const weights=(profile?.traitIds??[]).map(id=>registries.personalities.has(id)?Number(registries.personalities.get(id).initiativeWeight??1):1);
    const weight=Math.max(1,Math.round(weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:1));
    for(let i=0;i<weight;i++)weighted.push(rel);
  }
  return weighted[randomInt(draft,0,weighted.length-1)];
}

function createNpcDecision(draft, registries, {personId, unitId, definitionId, relationship}) {
  const def=registries.gameplayEvents.get(definitionId);
  if(!def)return null;
  const otherId=relationship?otherPersonId(relationship,personId):null;
  const id=createEntityId(draft,"gameevt");
  draft.entities.gameplayEventRecords[id]={id,schemaVersion:4,definitionId:def.id,personId,unitId,activityId:null,gameDate:draft.world.date,elapsedDays:draft.world.clock.elapsedDays,status:"pending",selectedChoiceId:null,resolvedDate:null,expiresElapsedDay:Number.isFinite(def.decisionDeadlineDays)?draft.world.clock.elapsedDays+def.decisionDeadlineDays:null,targetRelationshipId:relationship?.id??null,targetPersonId:otherId,sourceType:"living_career"};
  const targetName=otherId?draft.entities.people[otherId]?.identity?.displayName:null;
  const message=targetName?`${def.message} ${targetName} is involved.`:def.message;
  const noticeId=recordNotification(draft,{personId,type:"decision_required",title:def.title,message,priority:def.priority??"normal",references:{eventRecordId:id}});
  recordUnitEvent(draft,{unitId,type:"interpersonal_event",title:def.title,summary:message,personId:otherId,sourceType:"living_career",sourceId:id,importance:"routine"});
  return {eventRecordId:id,notificationId:noticeId};
}

function createContextNotice(draft,{personId,unitId,title,message,type="unit_life",importance="routine",personSourceId=null}){
  const noticeId=recordNotification(draft,{personId,type,title,message,priority:importance==="attention"?"high":"normal",references:{unitId}});
  recordUnitEvent(draft,{unitId,type,title,summary:message,personId:personSourceId,sourceType:"living_career",importance});
  return noticeId;
}

export function processLivingCareerForDay(draft, registries, personId) {
  const person=draft.entities.people?.[personId];
  if(!person?.affiliation?.unitId || person.condition.status!=="active")return {notificationIds:[],eventRecordIds:[]};
  seedPersonalityProfiles(draft,registries);
  draft.world.livingCareer ??={version:1,lastPlayerEventElapsedDay:-999};
  const lc=draft.world.livingCareer;
  const now=draft.world.clock.elapsedDays;
  if(now-(lc.lastPlayerEventElapsedDay??-999)<5)return {notificationIds:[],eventRecordIds:[]};
  // Living-unit events are intentionally intermittent. Most days remain routine.
  if(randomInt(draft,1,100)>18)return {notificationIds:[],eventRecordIds:[]};
  const unitId=person.affiliation.unitId;
  const notifications=[],events=[];
  const performance=recentPerformanceAverage(draft,personId);
  let result=null;
  if(performance!=null && performance>=78 && randomInt(draft,1,100)<=45){
    const rel=chooseRelationship(draft,registries,personId,unitId,"leader");
    if(rel){
      const leader=draft.entities.people[otherPersonId(rel,personId)];
      rel.respect=Math.min(100,(rel.respect??0)+2); rel.trust=Math.min(100,(rel.trust??0)+1); rel.lastInteractionDate=draft.world.date;
      recordRelationshipMemory(draft,{personId,otherPersonId:leader.id,type:"performance_recognition",summary:`${leader.identity.displayName} recognized strong recent performance.`,trustDelta:1,respectDelta:2});
      notifications.push(createContextNotice(draft,{personId,unitId,title:"Leader Recognition",message:`${leader.identity.displayName} recognizes your recent strong performance and reliability.`,type:"leader_recognition",personSourceId:leader.id}));
    }
  } else if(performance!=null && performance<58 && randomInt(draft,1,100)<=55){
    const rel=chooseRelationship(draft,registries,personId,unitId,"leader");
    if(rel) result=createNpcDecision(draft,registries,{personId,unitId,definitionId:"event_living_counseling",relationship:rel});
  } else {
    const rel=chooseRelationship(draft,registries,personId,unitId,"peer");
    if(rel) result=createNpcDecision(draft,registries,{personId,unitId,definitionId:"event_living_teammate_help",relationship:rel});
  }
  if(result){events.push(result.eventRecordId);notifications.push(result.notificationId);}
  if(notifications.length||events.length)lc.lastPlayerEventElapsedDay=now;
  return {notificationIds:notifications,eventRecordIds:events};
}
