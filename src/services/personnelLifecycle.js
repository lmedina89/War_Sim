import { createEntityId } from "../core/ids.js";
import { daysBetweenIso } from "./dateMath.js";

const NEXT_ENLISTED = { rank_army_e1:"rank_army_e2", rank_army_e2:"rank_army_e3", rank_army_e3:"rank_army_e4" };
const XP_REQUIREMENT = { rank_army_e2:300, rank_army_e3:700, rank_army_e4:1500 };
const TIS_REQUIREMENT = { rank_army_e2:180, rank_army_e3:365, rank_army_e4:730 };

export function simulatePersonnelLifecycle(draft, days, { excludePersonId=null }={}) {
  const cycles=Math.max(1,Math.floor(days/30));
  for(const person of Object.values(draft.entities.people)){
    if(person.id===excludePersonId || person.condition.status!=="active") continue;
    person.career.experience += cycles * (12 + (person.id.length % 7));
    person.condition.fatigue = Math.max(0, Math.min(100, person.condition.fatigue + cycles - 2));
    person.condition.readiness = Math.max(40, Math.min(100, 75 + Math.floor(person.career.experience/500) - Math.floor(person.condition.fatigue/8)));
    const nextRankId=NEXT_ENLISTED[person.affiliation.rankId];
    if(!nextRankId) continue;
    const tis=daysBetweenIso(person.career.enlistmentDate,draft.world.date);
    if(person.career.experience < XP_REQUIREMENT[nextRankId] || tis < TIS_REQUIREMENT[nextRankId]) continue;
    const previousRankId=person.affiliation.rankId;
    person.affiliation.rankId=nextRankId;
    person.career.lastPromotionDate=draft.world.date;
    const recordId=createEntityId(draft,"prom");
    draft.entities.promotionRecords[recordId]={id:recordId,schemaVersion:1,personId:person.id,previousRankId,rankId:nextRankId,date:draft.world.date,reason:"npc_career_progression"};
  }
}
