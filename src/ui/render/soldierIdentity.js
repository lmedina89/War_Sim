import { readUiText, writeUiText } from "../uiStorage.js";

export function createSoldierIdentityRenderer({
  container, registries, selectSoldierIdentity, selectAssignmentView,
  createInsignia, createRankInsignia, awardDeviceLabel, metricBlock, statLine,
}) {
  let activeSoldierTab = "uniform";

function render(state,indexes,personId,career) {
  const identity=selectSoldierIdentity(state,indexes,registries,personId);
  const soldierAssignment=selectAssignmentView(state,indexes,registries,personId);
  const soldierUnitLabel=soldierAssignment.chain.map(item=>item.name).join(" › ") || identity.unitName;
  container.replaceChildren();
  const identityNav=document.createElement("nav"); identityNav.className="screen-tabs identity-screen-tabs"; identityNav.setAttribute("aria-label","Soldier identity sections");
  const identityTabDefs=[["uniform","Uniform"],["loadout","Loadout"],["awards","Awards"],["catalog","Catalog"],["record","Record"]];
  const setIdentityTab=(tab,{scroll=false}={})=>{activeSoldierTab=identityTabDefs.some(([id])=>id===tab)?tab:"uniform";for(const panel of container.querySelectorAll("[data-identity-screen]"))panel.hidden=panel.dataset.identityScreen!==activeSoldierTab;for(const button of identityNav.querySelectorAll("[data-identity-tab]")){if(button.dataset.identityTab===activeSoldierTab)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");}writeUiText("war-sim:ui:screen:soldier-identity",activeSoldierTab);if(scroll)window.scrollTo({top:0,behavior:"auto"});};
  for(const [id,label] of identityTabDefs){const button=document.createElement("button");button.type="button";button.dataset.identityTab=id;button.textContent=label;button.addEventListener("click",()=>setIdentityTab(id,{scroll:true}));identityNav.appendChild(button);}
  activeSoldierTab=readUiText("war-sim:ui:screen:soldier-identity",activeSoldierTab);
  const tabs=document.createElement("div"); tabs.className="soldier-identity-tabs";

  const uniform=document.createElement("section"); uniform.className="identity-subpanel uniform-card"; uniform.dataset.identityScreen="uniform";
  const uniformHead=document.createElement("div"); uniformHead.className="identity-subhead"; const uh=document.createElement("h3");uh.textContent="Service Uniform";const us=document.createElement("span");us.textContent=`${identity.rank} · ${identity.specialty}`;uniformHead.append(uh,us);
  const blouse=document.createElement("div");blouse.className="uniform-blouse";
  const nameTape=document.createElement("div");nameTape.className="uniform-name-tape";nameTape.textContent=identity.name.split(" ").at(-1)?.toUpperCase()??identity.name.toUpperCase();
  const armyTape=document.createElement("div");armyTape.className="uniform-army-tape";armyTape.textContent="U.S. ARMY";
  const rankMark=document.createElement("div");rankMark.className="uniform-rank-mark";rankMark.append(createRankInsignia(registries.ranks.get(state.entities.people[personId].affiliation.rankId)));
  const rack=document.createElement("div");rack.className="uniform-ribbon-rack";rack.setAttribute("aria-label","Earned ribbon rack");
  for(const item of identity.ribbons){const slot=document.createElement("span");slot.className="uniform-ribbon-slot";slot.append(createInsignia(item.definition));const device=awardDeviceLabel(item);if(device){const d=document.createElement("small");d.className="insignia-device";d.textContent=device;slot.appendChild(d);}rack.appendChild(slot);}
  if(!identity.ribbons.length){const empty=document.createElement("span");empty.className="uniform-empty-slot";empty.textContent="NO RIBBONS";rack.appendChild(empty);}
  const badgeRack=document.createElement("div");badgeRack.className="uniform-badge-rack";
  for(const item of identity.badges){const slot=document.createElement("span");slot.className="uniform-badge-slot";slot.append(createInsignia(item.definition));badgeRack.appendChild(slot);}
  if(identity.rifleQualification){const slot=document.createElement("span");slot.className="uniform-badge-slot qualification-insignia";slot.append(createInsignia(null,{qualificationResult:identity.rifleQualification.result,badgeClasp:identity.rifleQualification.badgeClasp??"RIFLE"}));badgeRack.appendChild(slot);}
  const tabRack=document.createElement("div");tabRack.className="uniform-tab-rack";for(const item of identity.tabs)tabRack.append(createInsignia(item.definition));
  blouse.append(nameTape,armyTape,rankMark,tabRack,rack,badgeRack);
  const uniformNote=document.createElement("p");uniformNote.className="muted compact-note";uniformNote.textContent="Displayed insignia is generated from canonical award and qualification records; qualification badges update from the latest valid rating.";
  uniform.append(uniformHead,blouse,uniformNote);

  const loadout=document.createElement("section");loadout.className="identity-subpanel loadout-card";loadout.dataset.identityScreen="loadout";const lh=document.createElement("h3");lh.textContent="Combat Loadout";loadout.appendChild(lh);
  const cp=identity.combatProfile; const stats=document.createElement("div");stats.className="combat-profile-grid";for(const [label,value] of [["OVERALL",cp.overall],["ACCURACY",cp.accuracy],["FIREPOWER",cp.firepower],["MOBILITY",cp.mobility],["RELIABILITY",cp.reliability]])stats.append(metricBlock(label,`${value}%`));
  loadout.append(statLine("Primary Weapon",cp.primaryWeapon),statLine("Equipment Condition",cp.equipmentCondition==null?"—":`${cp.equipmentCondition}%`),stats);
  if(identity.rifleQualification)loadout.append(statLine("Current Rifle Rating",`${identity.rifleQualification.result.toUpperCase()}${identity.rifleQualification.score!=null?` · ${identity.rifleQualification.score}/${identity.rifleQualification.maxScore}`:""}`));
  const loadoutNote=document.createElement("p");loadoutNote.className="muted compact-note";loadoutNote.textContent="Combat profile is derived from actual equipped weapon statistics, equipment condition, readiness, fatigue, health, and current marksmanship qualification.";loadout.appendChild(loadoutNote);
  tabs.append(uniform,loadout); container.append(identityNav,tabs);

  const earned=document.createElement("section");earned.className="identity-detail identity-tab-panel";earned.dataset.identityScreen="awards";const earnedSummary=document.createElement("div");earnedSummary.className="section-heading compact-heading";const earnedKicker=document.createElement("p");earnedKicker.className="section-kicker";earnedKicker.textContent="DECORATIONS";const earnedTitle=document.createElement("h3");earnedTitle.textContent="Awards & Insignia";earnedSummary.append(earnedKicker,earnedTitle);earned.appendChild(earnedSummary);const earnedBody=document.createElement("div");earnedBody.className="insignia-collection";
  const all=[...identity.ribbons,...identity.badges,...identity.tabs];
  if(identity.rifleQualification){const card=document.createElement("article");card.className="insignia-card";card.append(createInsignia(null,{qualificationResult:identity.rifleQualification.result,badgeClasp:identity.rifleQualification.badgeClasp??"RIFLE"}),metricBlock("QUALIFICATION BADGE",`${identity.rifleQualification.result.toUpperCase()} · ${identity.rifleQualification.badgeClasp??"RIFLE"}`),metricBlock("COMPLETED",identity.rifleQualification.completedDate));earnedBody.appendChild(card);}
  for(const item of all){const latest=item.records.slice().sort((a,b)=>String(b.earnedDate).localeCompare(String(a.earnedDate)))[0];const card=document.createElement("article");card.className="insignia-card";card.append(createInsignia(item.definition),metricBlock(item.definition.category.toUpperCase(),item.definition.name),metricBlock("EARNED",latest?.earnedDate??"—"));const device=awardDeviceLabel(item);if(device)card.append(metricBlock("DEVICE",device));if(latest?.reason)card.append(metricBlock("WHY EARNED",latest.reason));const why=document.createElement("p");why.className="muted insignia-eligibility";why.textContent=item.definition.eligibilityDescription??"Eligibility pathway not yet modeled.";card.appendChild(why);earnedBody.appendChild(card);}
  if(!all.length&&!identity.rifleQualification){const empty=document.createElement("p");empty.className="empty-state military-empty";empty.textContent="NO DECORATIONS OR QUALIFICATION BADGES RECORDED";earnedBody.appendChild(empty);}earned.appendChild(earnedBody);container.appendChild(earned);

  const catalog=document.createElement("section");catalog.className="identity-detail identity-tab-panel";catalog.dataset.identityScreen="catalog";const catalogSummary=document.createElement("div");catalogSummary.className="section-heading compact-heading";const catalogKicker=document.createElement("p");catalogKicker.className="section-kicker";catalogKicker.textContent="ELIGIBILITY";const catalogTitle=document.createElement("h3");catalogTitle.textContent="Award Catalog";catalogSummary.append(catalogKicker,catalogTitle);catalog.appendChild(catalogSummary);const catalogBody=document.createElement("div");catalogBody.className="award-catalog";const earnedIds=new Set(all.map(item=>item.awardId));for(const def of [...registries.awards.values()].filter(item=>!item.legacy).sort((a,b)=>(a.precedence??9999)-(b.precedence??9999)||a.name.localeCompare(b.name))){const card=document.createElement("article");card.className=`award-catalog-card ${earnedIds.has(def.id)?"earned":"locked"}`;const art=createInsignia(def);const copy=document.createElement("div");const head=document.createElement("div");head.className="award-catalog-head";const title=document.createElement("strong");title.textContent=def.name;const stateLabel=document.createElement("span");stateLabel.className="award-state";stateLabel.textContent=earnedIds.has(def.id)?"EARNED":"NOT EARNED";head.append(title,stateLabel);const path=document.createElement("p");path.className="muted";path.textContent=def.eligibilityDescription??"Eligibility pathway pending.";copy.append(head,path);card.append(art,copy);catalogBody.appendChild(card);}catalog.appendChild(catalogBody);container.appendChild(catalog);

  const dd=document.createElement("section");dd.className="identity-detail identity-tab-panel";dd.dataset.identityScreen="record";const ddSummary=document.createElement("div");ddSummary.className="section-heading compact-heading";const ddKicker=document.createElement("p");ddKicker.className="section-kicker";ddKicker.textContent="SEPARATION RECORD";const ddTitle=document.createElement("h3");ddTitle.textContent="DD214-Style Preview";ddSummary.append(ddKicker,ddTitle);dd.appendChild(ddSummary);const body=document.createElement("div");body.className="dd214-preview";
  const service=state.entities.serviceRecords[state.entities.people[personId].serviceRecordId];body.append(metricBlock("NAME",identity.name),metricBlock("GRADE / RANK",`${identity.payGrade} / ${identity.rank}`),metricBlock("MOS",identity.specialty),metricBlock("UNIT",soldierUnitLabel),metricBlock("ENTRY DATE",service?.entryDate??"—"),metricBlock("SEPARATION DATE",service?.separationDate??"ACTIVE SERVICE"));
  const awardsText=identity.ribbons.concat(identity.badges,identity.tabs).map(item=>`${item.definition.dd214Label??item.definition.name}${item.count>1?` (${item.count} awards)`:""}`);if(identity.rifleQualification)awardsText.push(`${identity.rifleQualification.result[0].toUpperCase()+identity.rifleQualification.result.slice(1)} Marksmanship Qualification Badge w/${identity.rifleQualification.badgeClasp??"Rifle"} Clasp`);body.append(metricBlock("DECORATIONS / BADGES",awardsText.join("; ")||"None recorded"),metricBlock("MILITARY EDUCATION",career.education.filter(x=>x.status==="graduated").map(x=>x.name).join("; ")||"None recorded"));const disclaimer=document.createElement("p");disclaimer.className="muted compact-note";disclaimer.textContent="Game service-record preview inspired by separation paperwork; it is not an official reproduction of DD Form 214.";body.appendChild(disclaimer);dd.appendChild(body);container.appendChild(dd);
  setIdentityTab(activeSoldierTab,{scroll:false});
}


  return render;
}
