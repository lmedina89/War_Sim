function latestQualification(records){return records.slice().sort((a,b)=>String(b.completedDate??"").localeCompare(String(a.completedDate??""))||b.id.localeCompare(a.id))[0]??null;}
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Math.round(v)));}

export function selectSoldierIdentity(state,indexes,registries,personId){
  const person=state.entities.people[personId]; if(!person) throw new Error(`Unknown person: ${personId}`);
  const rank=registries.ranks.get(person.affiliation.rankId), specialty=registries.specialties.get(person.affiliation.specialtyId), unit=state.entities.units[person.affiliation.unitId];
  const awardRecords=(indexes.awardsByPersonId.get(personId)??[]).map(id=>state.entities.awardRecords[id]).filter(Boolean);
  const grouped=new Map();
  for(const record of awardRecords){const def=registries.awards.get(record.awardId);if(def.legacy)continue;const item=grouped.get(record.awardId)??{awardId:record.awardId,definition:def,count:0,records:[]};item.count++;item.records.push(record);grouped.set(record.awardId,item);}
  const awards=[...grouped.values()].sort((a,b)=>(a.definition.precedence??9999)-(b.definition.precedence??9999)||a.definition.name.localeCompare(b.definition.name));
  const ribbons=awards.filter(a=>["ribbon","medal","decoration"].includes(a.definition.category));
  const badges=awards.filter(a=>a.definition.category==="badge");
  const tabs=awards.filter(a=>a.definition.category==="tab");
  const qualificationRecords=(indexes.qualificationsByPersonId.get(personId)??[]).map(id=>state.entities.qualificationRecords[id]).filter(Boolean);
  const rifle=latestQualification(qualificationRecords.filter(r=>r.qualificationId==="qualification_service_rifle"&&r.result&&r.result!=="unqualified"));
  const loadout=state.entities.loadouts[person.loadoutId], primaryInstance=loadout?.slots?.primaryWeaponInstanceId?state.entities.equipmentInstances[loadout.slots.primaryWeaponInstanceId]:null;
  const primary=primaryInstance?registries.equipment.get(primaryInstance.definitionId):null, stats=primary?.stats??{};
  const marksmanshipBonus=rifle?.result==="expert"?14:rifle?.result==="sharpshooter"?9:rifle?.result==="marksman"?5:0;
  const readiness=person.condition?.readiness??0, fatigue=person.condition?.fatigue??0, health=person.condition?.health??0;
  const combatProfile={
    primaryWeapon:primary?.name??"Unassigned",equipmentCondition:primaryInstance?.condition??null,
    accuracy:clamp((stats.accuracy??0)*.72+marksmanshipBonus+readiness*.14-fatigue*.08),
    firepower:clamp((stats.damage??0)*.72+(stats.suppression??0)*.18+readiness*.1),
    mobility:clamp(100-(stats.weight??0)*.62-fatigue*.25+(health-50)*.1),
    reliability:clamp((stats.reliability??0)*.8+(primaryInstance?.condition??0)*.2),
    overall:0
  };
  combatProfile.overall=clamp((combatProfile.accuracy+combatProfile.firepower+combatProfile.mobility+combatProfile.reliability)/4);
  return {personId,name:person.identity.displayName,rank:rank.abbreviation,payGrade:rank.payGrade,specialty:`${specialty.code} ${specialty.name}`,unitName:unit?.name??"Unassigned",ribbons,badges,tabs,rifleQualification:rifle,combatProfile};
}
