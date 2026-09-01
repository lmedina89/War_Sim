import assert from "node:assert/strict";
import fs from "node:fs";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { performActivity } from "../src/commands/performActivity.js";
import { resolveDecision } from "../src/commands/resolveDecision.js";
import { setTrainingPhaseInDraft } from "../src/services/careerGameplay.js";
import { validateWorldState } from "../src/core/validator.js";

function careerStore(seed=418001){
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"Scope",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}

// Manual qualification is an individual activity. It may never issue or renew NPC credentials.
{
  const store=careerStore(418001), personId=store.getState().playerPersonId;
  const squadId=store.getState().entities.people[personId].affiliation.unitId;
  const npcIds=Object.values(store.getState().entities.people).filter(p=>p.id!==personId&&p.affiliation.unitId===squadId).map(p=>p.id);
  store.mutate(draft=>{
    setTrainingPhaseInDraft(draft,registries,"training_phase_operational",{clearFutureTemplateRecords:true});
    const profile=draft.entities.skillProfiles[`skills_${personId}`]; profile.values.skill_marksmanship=100; profile.values.skill_fieldcraft=100;
    const person=draft.entities.people[personId]; person.condition.health=100; person.condition.morale=100; person.condition.readiness=100; person.condition.fatigue=0;
  },["people","activities","careerGameplay"]);
  const beforeNpcQualifications=Object.values(store.getState().entities.qualificationRecords).filter(r=>npcIds.includes(r.personId)).map(r=>`${r.id}:${r.completedDate}:${r.score??""}`).sort();
  const result=performActivity(store,registries,personId,"activity_range");
  assert.equal(result.ok,true);
  const record=store.getState().entities.activityRecords[result.data.activityRecordId];
  assert.equal(record.sourceType,"player_activity");
  assert.equal(record.participantScope,"individual");
  assert.deepEqual(record.participantPersonIds,[personId]);
  const afterNpcQualifications=Object.values(store.getState().entities.qualificationRecords).filter(r=>npcIds.includes(r.personId)).map(r=>`${r.id}:${r.completedDate}:${r.score??""}`).sort();
  assert.deepEqual(afterNpcQualifications,beforeNpcQualifications,"manual player range must not change any squadmate qualification credential");
}

// A one-teammate coaching decision must affect one relationship, identify the teammate, and report measurable deltas.
{
  const store=careerStore(418002), state=store.getState(), personId=state.playerPersonId, indexes=store.getIndexes();
  const relationshipId=[...(indexes.relationshipsByPersonId.get(personId)??[])].sort()[0];
  assert.ok(relationshipId,"generated squad should provide a relationship for coaching QA");
  const relationship=state.entities.relationshipRecords[relationshipId];
  const targetPersonId=relationship.personAId===personId?relationship.personBId:relationship.personAId;
  const otherRelationshipIds=[...(indexes.relationshipsByPersonId.get(personId)??[])].filter(id=>id!==relationshipId);
  const otherTrustBefore=new Map(otherRelationshipIds.map(id=>[id,state.entities.relationshipRecords[id].trust]));
  store.mutate(draft=>{
    draft.entities.gameplayEventRecords.qa_coach_event={id:"qa_coach_event",schemaVersion:3,definitionId:"event_training_leadership_moment",personId,unitId:draft.entities.people[personId].affiliation.unitId,activityId:"activity_squad_drills",gameDate:draft.world.date,elapsedDays:draft.world.clock.elapsedDays,status:"pending",selectedChoiceId:null,resolvedDate:null,expiresElapsedDay:null,targetRelationshipId:relationshipId,targetPersonId};
  },["activities"]);
  const trustBefore=store.getState().entities.relationshipRecords[relationshipId].trust;
  const result=resolveDecision(store,registries,personId,"qa_coach_event","choice_help_teammate");
  assert.equal(result.ok,true);
  assert.equal(result.data.targetPersonId,targetPersonId);
  assert.ok(result.data.targetPersonName);
  assert.ok(result.data.changes.some(change=>change.label.startsWith("Trust with ")&&change.delta===2));
  assert.equal(store.getState().entities.relationshipRecords[relationshipId].trust,trustBefore+2);
  for(const [id,prior] of otherTrustBefore) assert.equal(store.getState().entities.relationshipRecords[id].trust,prior,"coaching one teammate must not raise every squad relationship identically");
}

const app=fs.readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const resultDialog=fs.readFileSync(new URL("../src/ui/dialogs/resultDialog.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/ui/styles.css",import.meta.url),"utf8");
assert.match(resultDialog,/PLAYER ONLY/,"manual activity AAR must disclose individual participation");
assert.match(resultDialog,/UNIT SCHEDULE/,"scheduled duty AAR must disclose unit source");
assert.match(app,/SERVICE RECORD HIGHLIGHTS/,"career overview must surface earned credentials");
assert.match(app,/UNIT_HISTORY_PREVIEW_LIMIT\s*=\s*5/,"Unit history must be bounded on the main Unit view");
assert.match(app,/archiveUiRecord\("unit-history"/,"Unit history must support presentation-only archiving");
assert.match(css,/roster-row td::before\{content:attr\(data-label\)/,"mobile Unit roster must reflow as labeled cards");
assert.match(css,/max-width:\s*680px/,"Unit mobile audit must have a narrow-screen breakpoint");

const finalState=careerStore(418003).getState();
assert.equal(validateWorldState(finalState,registries).ok,true);
console.log("War Sim v0.4.3.2 interaction, scope, and Unit-view QA passed");
