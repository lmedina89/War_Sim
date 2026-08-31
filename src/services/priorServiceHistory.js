import { randomInt, seedFromText } from "../core/rng.js";
import { addDaysIso, daysBetweenIso } from "./dateMath.js";

function localRngState(worldSeed, personId) {
  const seed = seedFromText(`${worldSeed}|${personId}|prior-service-v1`);
  return { world: { seed, rngState: seed } };
}
function makeHistoricalId(prefix, personId, suffix) { return `${prefix}_prior_${personId}_${suffix}`; }
function yearsOfService(person, worldDate) { return Math.max(0, Math.floor(daysBetweenIso(person.career.enlistmentDate, worldDate) / 365)); }
function dateBefore(worldDate, days) { return addDaysIso(worldDate, -Math.max(0, days)); }
function hasQualification(state, personId, qualificationId) { return Object.values(state.entities.qualificationRecords ?? {}).some(r => r.personId === personId && r.qualificationId === qualificationId); }
function hasAward(state, personId, awardId) { return Object.values(state.entities.awardRecords ?? {}).some(r => r.personId === personId && r.awardId === awardId); }
function hasEducation(state, personId, schoolId) { return Object.values(state.entities.militaryEducationRecords ?? {}).some(r => r.personId === personId && r.schoolId === schoolId); }

function addEducation(state, person, schoolId, completedDate, sourceReason="prior_service_generation") {
  if (hasEducation(state, person.id, schoolId)) return null;
  const id = makeHistoricalId("edu", person.id, schoolId.replace("school_", ""));
  state.entities.militaryEducationRecords[id] = { id, schemaVersion:1, personId:person.id, schoolId, status:"graduated", startDate:null, completedDate, sourceType:"generated_prior_service", sourceReason };
  return id;
}
function addQualification(state, person, qualificationId, completedDate, extras={}) {
  if (hasQualification(state, person.id, qualificationId)) return null;
  const id = makeHistoricalId("qual", person.id, qualificationId.replace("qualification_", ""));
  state.entities.qualificationRecords[id] = { id, schemaVersion:2, personId:person.id, qualificationId, completedDate, sourceType:"generated_prior_service", ...extras };
  return id;
}
function addAward(state, person, awardId, earnedDate, sourceId="prior_service") {
  if (hasAward(state, person.id, awardId)) return null;
  const id = makeHistoricalId("award", person.id, awardId.replace("award_", ""));
  state.entities.awardRecords[id] = { id, schemaVersion:2, personId:person.id, awardId, earnedDate, sourceType:"generated_prior_service", sourceId };
  return id;
}

export function seedPriorServiceHistoryForPerson(state, registries, personId, { force=false }={}) {
  const person = state.entities.people?.[personId];
  if (!person || personId === state.playerPersonId) return { seeded:false, reason:"player_or_missing" };
  state.entities.militaryEducationRecords ??= {};
  person.career ??= {};
  if (person.career.priorServiceHistoryVersion && !force) return { seeded:false, reason:"already_seeded" };
  const rng = localRngState(state.world.seed, personId);
  const years = yearsOfService(person, state.world.date);
  const rank = registries.ranks.get(person.affiliation.rankId);
  const created = { education:[], qualifications:[], awards:[] };

  // Operational-unit soldiers are treated as having completed initial-entry training.
  if (!hasAward(state, person.id, "award_army_service_ribbon")) {
    const id = addAward(state, person, "award_army_service_ribbon", dateBefore(state.world.date, Math.max(30, Math.min(330, randomInt(rng, 30, 330)))));
    if (id) created.awards.push(id);
  }

  // Seed a current, weapon-specific service-rifle qualification for NPCs.
  if (!hasQualification(state, person.id, "qualification_service_rifle")) {
    const completedAgo = randomInt(rng, 15, 300), completedDate = dateBefore(state.world.date, completedAgo);
    const marksmanship = Number(state.entities.skillProfiles?.[`skills_${person.id}`]?.values?.skill_marksmanship ?? 35);
    const centered = Math.round(18 + marksmanship * 0.28 + randomInt(rng, -4, 4));
    const score = Math.max(15, Math.min(40, centered));
    const result = score >= 36 ? "expert" : score >= 30 ? "sharpshooter" : score >= 23 ? "marksman" : "unqualified";
    if (result !== "unqualified") {
      const id=addQualification(state,person,"qualification_service_rifle",completedDate,{result,score,maxScore:40,weaponDefinitionId:"weapon_service_rifle",badgeClasp:"RIFLE",expiresDate:addDaysIso(completedDate,365),expiresElapsedDay:state.world.clock.elapsedDays-completedAgo+365});
      if(id)created.qualifications.push(id);
    }
  }

  // Existing NCOs must have completed the leader course that the current promotion model requires.
  if (rank.category === "enlisted" && rank.hierarchyLevel >= 5) {
    const completedDate=dateBefore(state.world.date, randomInt(rng, 180, Math.max(240, Math.min(1200, 240 + years * 120))));
    const edu=addEducation(state,person,"school_leadership",completedDate,"rank_consistency"); if(edu)created.education.push(edu);
    const qual=addQualification(state,person,"qualification_basic_leader",completedDate,{schoolId:"school_leadership",result:"graduate"}); if(qual)created.qualifications.push(qual);
    const ribbon=addAward(state,person,"award_nco_professional_development_ribbon",completedDate,"school_leadership"); if(ribbon)created.awards.push(ribbon);
  }

  // Airborne is plausible prior-service diversity, but intentionally uncommon in this conventional infantry company.
  const airborneChance = rank.hierarchyLevel >= 7 ? 18 : rank.hierarchyLevel >= 5 ? 14 : rank.hierarchyLevel >= 3 ? 8 : 4;
  if (years >= 1 && randomInt(rng,1,100) <= airborneChance) {
    const completedDate=dateBefore(state.world.date,randomInt(rng,180,Math.max(365,Math.min(1500,365+years*140))));
    const edu=addEducation(state,person,"school_airborne",completedDate); if(edu)created.education.push(edu);
    const qual=addQualification(state,person,"qualification_airborne",completedDate,{schoolId:"school_airborne",result:"graduate"}); if(qual)created.qualifications.push(qual);
    const badge=addAward(state,person,"award_parachutist_badge",completedDate,"school_airborne"); if(badge)created.awards.push(badge);
  }

  // Army Good Conduct Medal is seeded conservatively for enlisted personnel with 3+ years service.
  if (rank.category === "enlisted" && years >= 3) {
    const earnedDate=dateBefore(state.world.date,Math.max(30,randomInt(rng,30,330)));
    const medal=addAward(state,person,"award_army_good_conduct_medal",earnedDate); if(medal)created.awards.push(medal);
  }

  person.career.priorServiceHistoryVersion = 1;
  return { seeded:true, years, created };
}

export function seedPriorServiceHistories(state, registries) {
  state.entities.militaryEducationRecords ??= {};
  const results=[];
  for (const person of Object.values(state.entities.people ?? {}).sort((a,b)=>a.id.localeCompare(b.id))) results.push(seedPriorServiceHistoryForPerson(state,registries,person.id));
  return results;
}
