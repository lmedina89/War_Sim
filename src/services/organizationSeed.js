const FIRST = ["Marcus","Daniel","Evan","Noah","Liam","Mason","Caleb","Jordan","Avery","Cameron","Dylan","Eli","Gavin","Isaac","Jalen","Kai","Logan","Miles","Nolan","Owen","Parker","Quinn","Ryan","Samuel","Tyler","Victor","Wyatt","Xavier","Zane","Adrian"];
const LAST = ["Hill","Reyes","Brooks","Carter","Walker","Clark","Young","Price","Bennett","Collins","Diaz","Edwards","Foster","Garcia","Hughes","Irwin","James","King","Lewis","Mitchell","Nelson","Owens","Perry","Ramirez","Scott","Turner","Ward","Flores","Morgan","Cooper"];
const SQUAD_BILLETS = ["billet_squad_leader","billet_team_leader","billet_grenadier","billet_automatic_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman","billet_rifleman"];
const SQUAD_RANKS = ["rank_army_e5","rank_army_e4","rank_army_e3","rank_army_e3","rank_army_e2","rank_army_e2","rank_army_e3","rank_army_e2","rank_army_e1"];

function unit(id,name,echelonId,parentUnitId,childUnitIds=[]) { return { id,schemaVersion:3,organizationDefinitionId:echelonId==="echelon_company"?"orgdef_infantry_company":echelonId==="echelon_platoon"?"orgdef_infantry_platoon":"orgdef_infantry_squad",nationId:"nation_demo",branchId:"branch_army",echelonId,name,parentUnitId,childUnitIds,condition:{readiness:84,morale:78,cohesion:81,supply:92} }; }
function ensureCollections(state){ for(const k of ["people","units","billets","serviceRecords","loadouts","equipmentInstances"]) state.entities[k] ??= {}; }
export function npcIdentityForIndex(index) {
  const firstName = FIRST[index % FIRST.length];
  // Spread surnames across adjacent generated personnel instead of assigning the
  // same surname to blocks of 30. The arithmetic is deterministic for saves/tests.
  const lastName = LAST[((index * 7) + (Math.floor(index / FIRST.length) * 11)) % LAST.length];
  return { firstName, lastName, displayName: `${firstName} ${lastName}` };
}

function makeNpc(state,{id,unitId,billetId,definitionId,rankId,index}){
  if(state.entities.people[id]) return;
  const { firstName, lastName, displayName } = npcIdentityForIndex(index);
  const serviceId=`service_${id}`, loadoutId=`loadout_${id}`, eqId=`eq_${id}_primary`;
  state.entities.people[id]={id,schemaVersion:4,identity:{firstName,lastName,displayName},affiliation:{nationId:"nation_demo",branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",unitId,billetId,rankId},career:{enlistmentDate:index%5===0?"2039-06-01":"2042-01-15",experience:800+(index%18)*190,prestige:20+(index%12)*3,bonusEarnings:0},condition:{health:90+(index%11),morale:68+(index%21),fatigue:8+(index%17),readiness:72+(index%21),status:"active"},traitIds:["trait_steady"],loadoutId,serviceRecordId:serviceId,simulationTier:unitId==="unit_sq_001"?1:2};
  state.entities.serviceRecords[serviceId]={id:serviceId,schemaVersion:2,personId:id,serviceStatus:"active",entryDate:state.entities.people[id].career.enlistmentDate,separationDate:null,branchId:"branch_army",componentId:"component_active",specialtyId:"specialty_army_11b",currentContractId:null,servicePeriodIds:[]};
  state.entities.equipmentInstances[eqId]={id:eqId,schemaVersion:1,definitionId:definitionId==="billet_automatic_rifleman"?"weapon_auto_rifle":"weapon_service_rifle",ownerPersonId:id,condition:96+(index%5),upgradeIds:[]};
  state.entities.loadouts[loadoutId]={id:loadoutId,schemaVersion:2,ownerPersonId:id,slots:{primaryWeaponInstanceId:eqId}};
}
function addBillet(state,{id,unitId,definitionId,rankId,index,vacant=false}){
  if(state.entities.billets[id]) return;
  const personId=vacant?null:`pers_org_${String(index).padStart(3,"0")}`;
  state.entities.billets[id]={id,schemaVersion:1,unitId,definitionId,assignedPersonId:personId,status:personId?"filled":"vacant"};
  if(personId) makeNpc(state,{id:personId,unitId,billetId:id,definitionId,rankId,index});
}

export function ensureInfantryCompanyStructure(state){
  ensureCollections(state);
  const platoonIds=["unit_platoon_001","unit_platoon_002","unit_platoon_003"];
  state.entities.units.unit_company_001=unit("unit_company_001","Alpha Company","echelon_company",null,platoonIds);
  let n=1;
  const companyBillets=[["billet_company_commander","rank_army_o3"],["billet_executive_officer","rank_army_o2"],["billet_first_sergeant","rank_army_e8"],["billet_company_clerk","rank_army_e3"]];
  for(const [def,rank] of companyBillets) addBillet(state,{id:`billet_hq_co_${n}`,unitId:"unit_company_001",definitionId:def,rankId:rank,index:n++});
  for(let p=1;p<=3;p++){
    const pid=`unit_platoon_00${p}`, squadIds=[];
    for(let s=1;s<=3;s++) squadIds.push(p===1&&s===2?"unit_sq_001":`unit_sq_${p}${s}`);
    state.entities.units[pid]=unit(pid,`${p}${p===1?"st":p===2?"nd":"rd"} Platoon`,"echelon_platoon","unit_company_001",squadIds);
    addBillet(state,{id:`billet_hq_p${p}_1`,unitId:pid,definitionId:"billet_platoon_leader",rankId:"rank_army_o1",index:n++});
    addBillet(state,{id:`billet_hq_p${p}_2`,unitId:pid,definitionId:"billet_platoon_sergeant",rankId:"rank_army_e7",index:n++});
    for(let s=1;s<=3;s++){
      const sid=p===1&&s===2?"unit_sq_001":`unit_sq_${p}${s}`;
      state.entities.units[sid]=unit(sid,`${s}${s===1?"st":s===2?"nd":"rd"} Squad`,"echelon_squad",pid,[]);
      if(sid==="unit_sq_001") continue;
      SQUAD_BILLETS.forEach((def,i)=>addBillet(state,{id:`billet_${p}${s}_${i+1}`,unitId:sid,definitionId:def,rankId:SQUAD_RANKS[i],index:n++}));
    }
  }
  // Preserve whatever valid 9-billet player squad already exists. Older migrated saves
  // use billet_from_* IDs, while fresh worlds use billet_1..8 + billet_player.
  // Never key seeding solely off the canonical IDs: doing so duplicated an already-full
  // migrated squad in v0.3.1.
  const playerSquadBillets = () => Object.values(state.entities.billets).filter(b => b.unitId === "unit_sq_001");
  if (!state.entities.billets.billet_player) {
    addBillet(state,{id:"billet_player",unitId:"unit_sq_001",definitionId:"billet_rifleman",rankId:"rank_army_e1",index:n++,vacant:true});
  }
  for(let i=0; playerSquadBillets().length < 9 && i<8; i++){
    const id=`billet_${i+1}`;
    if(!state.entities.billets[id]) addBillet(state,{id,unitId:"unit_sq_001",definitionId:SQUAD_BILLETS[i],rankId:SQUAD_RANKS[i],index:n++});
  }
  state.world.careerStartUnitByBranchId={...(state.world.careerStartUnitByBranchId??{}),branch_army:"unit_sq_001"};
  return state;
}
