import { commandResult } from "../core/commandResult.js";
import { requestSchoolOpportunityInDraft, updateCareerObjectivesInDraft } from "../services/careerGameplay.js";
import { recordAction } from "../services/recordServices.js";
import { assertActiveServiceAction } from "../services/serviceLifecycle.js";

export function requestSchoolOpportunity(store, registries, schoolId) {
  const personId=store.getState().playerPersonId;
  if(!personId) throw new Error("Start a career before requesting a school.");
  assertActiveServiceAction(store.getState(), personId);
  let result;
  store.mutate(draft=>{
    result=requestSchoolOpportunityInDraft(draft,registries,personId,schoolId);
    recordAction(draft,{actorPersonId:personId,commandType:"request_school_opportunity",payload:{schoolId},resultCode:"school_opportunity_requested"});
    updateCareerObjectivesInDraft(draft,registries,personId);
  },["careerGameplay","notifications","actions"]);
  const school=registries.schools.get(schoolId);
  return commandResult({code:"school_opportunity_requested",message:`${school.name} volunteer request opened.`,data:result,notifications:[result.notificationId]});
}
