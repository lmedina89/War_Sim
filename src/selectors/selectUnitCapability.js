function descendantUnitIds(state, indexes, rootUnitId) {
  const out=[], queue=[rootUnitId], seen=new Set();
  while(queue.length){ const id=queue.shift(); if(!id||seen.has(id)) continue; seen.add(id); out.push(id); for(const childId of indexes.unitsByParentUnitId?.get(id)??[]) queue.push(childId); }
  return out;
}
function clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Math.round(v))); }
function doctrineForUnit(state, registries, unit){ return registries.unitDoctrines.values().find(d=>(d.organizationDefinitionIds??[]).includes(unit.organizationDefinitionId))??null; }
export function selectUnitCapabilityInventory(state,indexes,registries,unitId){
  const unit=state.entities.units[unitId]; if(!unit) return null;
  const scopedUnitIds=descendantUnitIds(state,indexes,unitId); const scopedSet=new Set(scopedUnitIds);
  const personIds=[]; for(const id of scopedUnitIds) personIds.push(...(indexes.peopleByUnitId?.get(id)??[]));
  const items=[]; const capabilityMap=new Map();
  for(const personId of personIds){
    const person=state.entities.people[personId]; if(!person) continue;
    const profileId=indexes.skillProfileByPersonId?.get(personId); const profile=profileId?state.entities.skillProfiles[profileId]:null;
    for(const equipmentId of indexes.equipmentByOwnerId?.get(personId)??[]){
      const instance=state.entities.equipmentInstances[equipmentId], def=instance&&registries.equipment.has(instance.definitionId)?registries.equipment.get(instance.definitionId):null; if(!def) continue;
      const condition=clamp(instance.condition??0), operational=condition>=60, available=["active","training"].includes(person.condition.status), crewed=available;
      const skillIds=def.operatorSkillIds??[]; const operatorSkill=skillIds.length?Math.round(skillIds.reduce((sum,id)=>sum+Number(profile?.values?.[id]??20),0)/skillIds.length):50;
      const effectiveness=operational&&crewed?clamp(condition*.55+operatorSkill*.45):0;
      const item={equipmentInstanceId:equipmentId,definitionId:def.id,name:def.name,platformClassId:def.platformClassId??null,domain:def.domain??"land",ownerPersonId:personId,ownerName:person.identity.displayName,condition,operational,crewed,supplyStatus:"not_modeled",effectiveness}; items.push(item);
      for(const contribution of def.capabilityContributions??[]){
        const cap=registries.capabilities.get(contribution.capabilityId); let agg=capabilityMap.get(cap.id); if(!agg){agg={id:cap.id,name:cap.name,domain:cap.domain,category:cap.category,assigned:0,operational:0,crewed:0,effectivePoints:0,sources:[]};capabilityMap.set(cap.id,agg);} agg.assigned++; if(operational)agg.operational++;if(crewed)agg.crewed++; const points=effectiveness*Number(contribution.weight??1);agg.effectivePoints+=points;agg.sources.push({personId,equipmentInstanceId:equipmentId,points:Math.round(points),condition,effectiveness});
      }
    }
  }
  const capabilities=[...capabilityMap.values()].map(x=>({...x,effectivePoints:Math.round(x.effectivePoints),averageEffectiveness:x.assigned?Math.round(x.effectivePoints/x.assigned):0})).sort((a,b)=>b.effectivePoints-a.effectivePoints||a.name.localeCompare(b.name));
  const doctrine=doctrineForUnit(state,registries,unit);
  return {unitId,unitName:unit.name,scopedUnitIds,personCount:personIds.length,doctrine:doctrine?{id:doctrine.id,name:doctrine.name,baselineMissionTags:[...(doctrine.baselineMissionTags??[])],capabilityPriorities:[...(doctrine.capabilityPriorities??[])]}:null,items,capabilities,totals:{assigned:items.length,operational:items.filter(x=>x.operational).length,crewed:items.filter(x=>x.crewed).length},supplyModelStatus:"not_modeled",battleResolutionStatus:"not_implemented"};
}
