import { commandResult } from "../core/commandResult.js";
import { scheduleAdditionalDutyInDraft } from "../services/careerGameplay.js";
import { recordAction, recordNotification } from "../services/recordServices.js";

export function scheduleUnitDuty(store, registries, personId, dutyDefinitionId) {
  const state = store.getState();
  const person = state.entities.people[personId];
  if (!person) throw new Error("Personnel record not found.");
  const billet = person.affiliation.billetId ? state.entities.billets[person.affiliation.billetId] : null;
  const billetDef = billet ? registries.billets.get(billet.definitionId) : null;
  const role = billetDef ? registries.roles.get(billetDef.roleId) : null;
  if (!(role?.authorityIds ?? []).includes("authority_schedule_unit_training")) throw new Error("Your current billet does not authorize unit training scheduling.");
  const duty = registries.duties.get(dutyDefinitionId);
  if (!duty) throw new Error("Unknown duty type.");
  if (!["training","maintenance","field","recovery"].includes(duty.category)) throw new Error("This duty type cannot be command-scheduled.");
  let record, noticeId;
  store.mutate(draft => {
    record = scheduleAdditionalDutyInDraft(draft, registries, { personId, unitId: person.affiliation.unitId, dutyDefinitionId });
    noticeId = recordNotification(draft, { personId, type:"duty_scheduled", title:`${duty.name} Scheduled`, message:`${duty.name} is scheduled for ${record.startDate}.`, priority:"normal", references:{ scheduleRecordId:record.id, dutyDefinitionId:duty.id } });
    recordAction(draft, { actorPersonId:personId, commandType:"schedule_unit_duty", payload:{ dutyDefinitionId:duty.id, scheduleRecordId:record.id }, resultCode:"duty_scheduled" });
  }, ["careerGameplay","notifications","actions"]);
  return commandResult({ code:"duty_scheduled", message:`${duty.name} scheduled for ${record.startDate}.`, data:{ scheduleRecordId:record.id, startDate:record.startDate, dutyDefinitionId:duty.id }, notifications:[noticeId] });
}
