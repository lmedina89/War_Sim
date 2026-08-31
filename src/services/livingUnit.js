import { createEntityId } from "../core/ids.js";

function clamp(value, min=0, max=100) { return Math.max(min, Math.min(max, Math.round(Number(value) || 0))); }

export function recordUnitEvent(draft, { unitId, type, title, summary, personId = null, sourceType = null, sourceId = null, importance = "routine" }) {
  draft.entities.unitEventRecords ??= {};
  const id = createEntityId(draft, "uevent");
  draft.entities.unitEventRecords[id] = {
    id, schemaVersion: 1, unitId, personId, type, title, summary, importance,
    gameDate: draft.world.date, elapsedDay: draft.world.clock.elapsedDays, sourceType, sourceId
  };
  return id;
}

export function syncSimulationTiersForPlayerUnit(draft, playerPersonId) {
  const player = draft.entities.people[playerPersonId];
  if (!player?.affiliation?.unitId) return;
  const playerUnit = draft.entities.units[player.affiliation.unitId];
  const platoonId = playerUnit?.parentUnitId ?? null;
  const companyId = platoonId ? draft.entities.units[platoonId]?.parentUnitId ?? null : null;
  for (const person of Object.values(draft.entities.people ?? {})) {
    if (person.id === playerPersonId) { person.simulationTier = 0; continue; }
    const unitId = person.affiliation?.unitId;
    const unit = unitId ? draft.entities.units[unitId] : null;
    if (unitId === player.affiliation.unitId) person.simulationTier = 1;
    else if (unit?.parentUnitId === platoonId || unitId === platoonId) person.simulationTier = 1;
    else if (unit?.parentUnitId === companyId || draft.entities.units[unit?.parentUnitId]?.parentUnitId === companyId || unitId === companyId) person.simulationTier = 2;
    else person.simulationTier = Math.max(2, person.simulationTier ?? 2);
  }
}

function ensureRelationship(draft, personAId, personBId) {
  if (!personAId || !personBId || personAId === personBId) return null;
  const [a,b] = [personAId,personBId].sort();
  for (const record of Object.values(draft.entities.relationshipRecords ?? {})) {
    const [ra,rb] = [record.personAId,record.personBId].sort();
    if (ra === a && rb === b) return record;
  }
  const id = createEntityId(draft, "rel");
  const record = { id, schemaVersion: 1, personAId:a, personBId:b, familiarity:2, trust:0, respect:0, bond:0, relationshipType:"squadmate", lastInteractionDate:draft.world.date };
  draft.entities.relationshipRecords[id] = record;
  return record;
}


function qualificationBand(duty, score) {
  return [...(duty.resultBands ?? [])].sort((a,b)=>(b.minimumScore??0)-(a.minimumScore??0)).find(band => score >= (band.minimumScore ?? 0)) ?? { result:"qualified", label:"QUALIFIED" };
}

export function recordDutyQualification(draft, registries, personId, duty, score) {
  if (!duty?.qualificationId) return null;
  const band=qualificationBand(duty,score);
  if (band.result === "unqualified") return { qualificationRecordId:null, result:band.result, label:band.label };
  let record=null;
  for (const candidate of Object.values(draft.entities.qualificationRecords ?? {})) {
    if (candidate.personId === personId && candidate.qualificationId === duty.qualificationId) { record=candidate; break; }
  }
  if (!record) {
    const id=createEntityId(draft,"qual");
    record={ id, schemaVersion:2, personId, schoolId:null, qualificationId:duty.qualificationId, completedDate:draft.world.date, result:band.result };
    draft.entities.qualificationRecords[id]=record;
  } else {
    record.schemaVersion=Math.max(2,record.schemaVersion??1); record.completedDate=draft.world.date; record.result=band.result;
  }
  record.expiresElapsedDay=draft.world.clock.elapsedDays + (duty.qualificationValidityDays ?? 180);
  record.expiresDate=new Date(new Date(`${draft.world.date}T00:00:00Z`).getTime()+(duty.qualificationValidityDays??180)*86400000).toISOString().slice(0,10);
  record.sourceType="scheduled_duty"; record.sourceId=duty.id;
  return { qualificationRecordId:record.id, result:band.result, label:band.label };
}
export function applyNpcParticipationForDuty(draft, registries, { unitId, duty, playerPersonId, performanceScore, participantPersonIds = null }) {
  if (!unitId || !duty) return { participantIds:[], performanceRecordIds:[], relationshipIds:[] };
  const candidateIds = participantPersonIds ?? [];
  const participantIds = candidateIds.filter(id => {
    const p = draft.entities.people?.[id];
    return p && p.id !== playerPersonId && p.affiliation?.unitId === unitId && ["active","training"].includes(p.condition?.status) && (p.simulationTier ?? 2) <= 1;
  }).sort();
  const performanceRecordIds=[];
  const npc = duty.npcEffects ?? {};
  for (const personId of participantIds) {
    const person=draft.entities.people[personId];
    person.career.experience += Math.max(0, Math.round(npc.experience ?? 0));
    if (Number.isFinite(npc.fatigue)) person.condition.fatigue=clamp(person.condition.fatigue+npc.fatigue);
    if (Number.isFinite(npc.readiness)) person.condition.readiness=clamp(person.condition.readiness+npc.readiness);
    if (Number.isFinite(npc.health)) person.condition.health=clamp(person.condition.health+npc.health);
    const profile=draft.entities.skillProfiles?.[`skills_${personId}`];
    if (profile && Array.isArray(npc.skillIds)) for (const skillId of npc.skillIds) profile.values[skillId]=clamp((profile.values[skillId]??20)+1);
    if (person.loadoutId) {
      const loadout=draft.entities.loadouts[person.loadoutId];
      const eqId=loadout?.slots?.primaryWeaponInstanceId;
      const eq=eqId ? draft.entities.equipmentInstances[eqId] : null;
      if (eq && Number.isFinite(npc.equipmentWear)) eq.condition=clamp(eq.condition-npc.equipmentWear);
      if (eq && Number.isFinite(npc.equipmentRestore)) eq.condition=clamp(eq.condition+npc.equipmentRestore);
    }
    const score=clamp((performanceScore ?? 70) + ((person.career.experience + personId.length) % 11) - 5);
    const rating=score>=85?"exceptional":score>=70?"strong":score>=50?"satisfactory":"poor";
    const id=createEntityId(draft,"perf");
    draft.entities.performanceRecords[id]={ id, schemaVersion:2, personId, unitId, sourceType:"unit_duty_participation", sourceId:duty.id, gameDate:draft.world.date, rating, score, notes:`Participated in ${duty.name}.` };
    if (duty.qualificationId) recordDutyQualification(draft,registries,personId,duty,score);
    performanceRecordIds.push(id);
  }
  const relationshipIds=[];
  if (["duty_squad_drills","duty_field_exercise","duty_range"].includes(duty.id) && participantIds.length>=2) {
    const rotation=(draft.world.clock.elapsedDays ?? 0)%participantIds.length;
    for (let i=0;i<Math.min(3,participantIds.length-1);i++) {
      const a=participantIds[(rotation+i)%participantIds.length], b=participantIds[(rotation+i+1)%participantIds.length];
      const rel=ensureRelationship(draft,a,b); if(!rel) continue;
      rel.familiarity=clamp(rel.familiarity+1,-100,100); rel.trust=clamp(rel.trust+1,-100,100); rel.lastInteractionDate=draft.world.date; relationshipIds.push(rel.id);
    }
  }
  return { participantIds, performanceRecordIds, relationshipIds };
}

export function recordReadinessSnapshot(draft, unitId, readinessResult, { force=false }={}) {
  if (!unitId || !readinessResult) return null;
  draft.entities.unitReadinessSnapshots ??= {};
  const prior=Object.values(draft.entities.unitReadinessSnapshots).filter(r=>r.unitId===unitId).sort((a,b)=>b.elapsedDay-a.elapsedDay)[0];
  if (!force && prior && draft.world.clock.elapsedDays-prior.elapsedDay<7 && Math.abs(prior.overall-readinessResult.overall)<2) return null;
  const id=createEntityId(draft,"rdy");
  draft.entities.unitReadinessSnapshots[id]={ id,schemaVersion:1,unitId,gameDate:draft.world.date,elapsedDay:draft.world.clock.elapsedDays,overall:readinessResult.overall,components:{...(readinessResult.components??{})} };
  return id;
}

export function readinessTrendFromSnapshots(state, unitId) {
  const rows=Object.values(state.entities.unitReadinessSnapshots ?? {}).filter(r=>r.unitId===unitId).sort((a,b)=>b.elapsedDay-a.elapsedDay);
  if (rows.length<2) return { direction:"stable", delta:0 };
  const recent=rows[0], baseline=rows.find(r=>recent.elapsedDay-r.elapsedDay>=7) ?? rows[Math.min(rows.length-1,3)];
  const delta=recent.overall-baseline.overall;
  return { direction:delta>=2?"improving":delta<=-2?"declining":"stable", delta };
}
