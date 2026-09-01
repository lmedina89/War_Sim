import assert from "node:assert/strict";
import fs from "node:fs";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { evaluatePromotionEligibility, findNextRank } from "../src/services/careerRules.js";
import { careerStartFormationForSeed, ensureNamedInfantryFormation } from "../src/services/formationIdentity.js";

class FakeStorage {
  constructor(){ this.map=new Map(); }
  getItem(k){ return this.map.has(k)?this.map.get(k):null; }
  setItem(k,v){ this.map.set(k,String(v)); }
  removeItem(k){ this.map.delete(k); }
}

function makeCareer(seed=433001){
  const store=createStateStore(createInitialWorldState({seed}));
  const result=createPlayerCareer(store,registries,{firstName:"Foundation",lastName:"QA",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",contractDefinitionId:"contract_army_4y",seed});
  assert.equal(result.ok,true);
  return store;
}

// State mutation is atomic: thrown mutations never touch the live world or indexes.
{
  const store=makeCareer(433010);
  const before=structuredClone(store.getState());
  const beforeIndexes=store.getIndexes();
  let notifications=0; const unsubscribe=store.subscribe(()=>notifications++);
  assert.throws(()=>store.mutate(draft=>{draft.world.date="2099-12-31";draft.entities.people[draft.playerPersonId].career.experience=999999;throw new Error("intentional rollback");},["people"]),/intentional rollback/);
  assert.deepEqual(store.getState(),before);
  assert.equal(store.getIndexes(),beforeIndexes);
  assert.equal(notifications,0);
  assert.throws(()=>store.mutate(draft=>{draft.world.date="2099-01-01";},["not-a-real-index-group"]),/Unknown index group/);
  assert.deepEqual(store.getState(),before);
  unsubscribe();
}

// Senior enlisted progression: SFC promotes to MSG; 1SG remains positional.
{
  const ssg=registries.ranks.get("rank_army_e6"), sfc=registries.ranks.get("rank_army_e7"), msg=registries.ranks.get("rank_army_e8_msg"), firstSergeant=registries.ranks.get("rank_army_e8");
  assert.equal(findNextRank(registries,ssg).id,"rank_army_e7");
  assert.equal(findNextRank(registries,sfc).id,"rank_army_e8_msg");
  assert.equal(msg.abbreviation,"MSG");
  assert.equal(findNextRank(registries,msg),null);
  assert.equal(firstSergeant.abbreviation,"1SG");
  assert.equal(firstSergeant.positional,true);
  assert.equal(findNextRank(registries,firstSergeant),null);

  const store=makeCareer(433020);
  const personId=store.getState().playerPersonId;
  store.mutate(draft=>{
    const person=draft.entities.people[personId];
    person.affiliation.rankId="rank_army_e6";
    person.career.enlistmentDate="2030-01-01";
    person.career.experience=9000;
    draft.world.date="2046-02-10";
    const qid="qual_foundation_blc";
    draft.entities.qualificationRecords[qid]={id:qid,schemaVersion:4,personId,schoolId:"school_blc",qualificationId:"qualification_basic_leader",completedDate:"2035-01-01",result:"graduated"};
    const pid="prom_foundation_ssg";
    draft.entities.promotionRecords[pid]={id:pid,schemaVersion:1,personId,previousRankId:"rank_army_e5",rankId:"rank_army_e6",effectiveDate:"2040-01-01",authority:"qa"};
  },["history"]);
  let eligibility=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(eligibility.eligible,true);
  assert.equal(eligibility.nextRank.id,"rank_army_e7");
  store.mutate(draft=>{
    draft.entities.people[personId].affiliation.rankId="rank_army_e7";
    draft.entities.people[personId].career.experience=10000;
    draft.entities.promotionRecords.prom_foundation_sfc={id:"prom_foundation_sfc",schemaVersion:1,personId,previousRankId:"rank_army_e6",rankId:"rank_army_e7",effectiveDate:"2042-01-01",authority:"qa"};
  },["history"]);
  eligibility=evaluatePromotionEligibility(store.getState(),store.getIndexes(),registries,personId);
  assert.equal(eligibility.eligible,true);
  assert.equal(eligibility.nextRank.id,"rank_army_e8_msg");
}

// Default unqualified 11B careers never start in the airborne/Ranger/SF formations.
{
  const seen=new Set();
  for(let seed=1;seed<=256;seed++) seen.add(careerStartFormationForSeed(seed).id);
  assert.deepEqual([...seen].sort(),["formation_193d_infantry","formation_5th_infantry","formation_7th_infantry"]);
  assert.ok(!seen.has("formation_82d_airborne"));
  assert.equal(registries.qualifications.has("qualification_airborne"),true);

  // Existing 82d careers remain 82d; the new rule changes fresh starts, not history.
  const legacy=createInitialWorldState({seed:433030});
  legacy.world.formationIdentityId="formation_82d_airborne";
  ensureNamedInfantryFormation(legacy);
  assert.equal(legacy.world.formationIdentityId,"formation_82d_airborne");
  assert.equal(legacy.entities.units.unit_formation_root.name,"82d Airborne Division");
}

// Required-store and semantic validation includes qualification attempts.
{
  const world=createInitialWorldState({seed:433040});
  delete world.entities.qualificationAttemptRecords;
  let validation=validateWorldState(world,registries);
  assert.equal(validation.ok,false);
  assert.match(validation.errors.join("\n"),/qualificationAttemptRecords/);

  const good=createInitialWorldState({seed:433041});
  const person=Object.values(good.entities.people)[0];
  good.entities.qualificationAttemptRecords.bad_attempt={id:"bad_attempt",schemaVersion:1,personId:person.id,qualificationId:"qualification_service_rifle",gameDate:good.world.date,elapsedDay:0,result:"marksman",label:"MARKSMAN",score:50,maxScore:40,qualified:true,sourceType:"qa",sourceId:"qa"};
  validation=validateWorldState(good,registries);
  assert.equal(validation.ok,false);
  assert.match(validation.errors.join("\n"),/attempt score outside range/);
}

// Corrupt/missing metadata indexes rebuild from payload; corrupt primaries recover from manual backups.
{
  globalThis.localStorage=new FakeStorage();
  const { saveToSlot, listSaveSlots, loadFromSlot }=await import("../src/core/saveSystem.js");
  const store=makeCareer(433050);
  saveToSlot(store.getState(),"slot_01");
  store.mutate(draft=>{draft.world.date="2046-02-11";});
  saveToSlot(store.getState(),"slot_01"); // backup is the first save
  const backupRaw=localStorage.getItem("warSim_save_backup_v3_slot_01");
  assert.ok(backupRaw);

  // Index corruption alone must never hide a valid slot.
  localStorage.setItem("warSim_save_index_v3","{broken index");
  let meta=listSaveSlots().find(item=>item.slotId==="slot_01");
  assert.equal(meta.empty,undefined);
  assert.equal(meta.characterName,"Foundation QA");
  assert.equal(meta.recoveredFromBackup,false);

  // Primary corruption should expose and then load the valid backup.
  localStorage.setItem("warSim_save_v3_slot_01","{broken primary");
  localStorage.setItem("warSim_save_index_v3","{broken again");
  meta=listSaveSlots().find(item=>item.slotId==="slot_01");
  assert.equal(meta.recoveredFromBackup,true);
  const loaded=loadFromSlot("slot_01");
  assert.equal(loaded.metadata.recoveredFromBackup,true);
  assert.equal(loaded.worldState.world.date,"2046-02-10");
  assert.equal(localStorage.getItem("warSim_save_v3_slot_01"),backupRaw,"valid backup should restore the primary slot when possible");
}

// Rank SVG fidelity coverage includes the new MSG and authentic structural distinctions.
{
  const insignia=fs.readFileSync(new URL("../src/ui/insignia.js",import.meta.url),"utf8");
  for(const id of ["rank_army_e1","rank_army_e2","rank_army_e3","rank_army_e4","rank_army_e5","rank_army_e6","rank_army_e7","rank_army_e8_msg","rank_army_e8","rank_army_o1","rank_army_o2","rank_army_o3"]) assert.match(insignia,new RegExp(id));
  assert.match(insignia,/PVT wears no grade insignia/);
  assert.match(insignia,/Spread eagle/);
  assert.match(insignia,/traditional railroad tracks/);
  assert.match(insignia,/lozenge:true/);
}

console.log("War Sim v0.4.3.16 foundation repair QA passed");
