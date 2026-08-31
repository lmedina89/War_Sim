import { evaluateSchoolEligibility, schoolOpportunitySourceLabel } from "../services/schoolEligibility.js";

export function selectSchoolCatalog(state, indexes, registries, personId) {
  return registries.schools.values().map(school=>{
    const eligibility=evaluateSchoolEligibility(state,registries,personId,school.id);
    const active=(indexes.opportunityRecordsByPersonId?.get(personId)??[])
      .map(id=>state.entities.opportunityRecords[id]).filter(Boolean)
      .find(record=>{
        const def=registries.opportunities.has(record.definitionId)?registries.opportunities.get(record.definitionId):null;
        return def?.schoolId===school.id && ["open","accepted","in_progress"].includes(record.status);
      }) ?? null;
    const education=(indexes.militaryEducationByPersonId?.get(personId)??[]).map(id=>state.entities.militaryEducationRecords[id]).filter(Boolean).find(record=>record.schoolId===school.id&&record.status==="graduated")??null;
    const requestable=registries.opportunities.values().some(def=>def.schoolId===school.id && (def.sourceTypes??[]).includes("player_request"));
    return {
      id:school.id,name:school.name,category:school.category,schoolType:school.schoolType??school.category,durationDays:school.durationDays,
      eligible:eligibility.eligible,reasons:eligibility.reasons,satisfied:eligibility.satisfied,completed:Boolean(education||eligibility.completed),completedDate:education?.completedDate??null,
      activeOpportunityId:active?.id??null,activeStatus:active?.status??null,activeSource:active?.sourceType?schoolOpportunitySourceLabel(active.sourceType):null,
      requestable:requestable && !active && !education && eligibility.eligible,
      opportunitySources:(school.opportunitySources??[]).map(sourceType=>({sourceType,label:schoolOpportunitySourceLabel(sourceType)})),
      grantsQualificationIds:[...(school.grantsQualificationIds??[])],completionAwardIds:[...(school.completionAwardIds??[])],capabilityContributions:[...(school.capabilityContributions??[])]
    };
  }).sort((a,b)=>Number(b.completed)-Number(a.completed)||Number(b.eligible)-Number(a.eligible)||a.name.localeCompare(b.name));
}
