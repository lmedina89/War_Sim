import assert from "node:assert/strict";
import fs from "node:fs";
import { registries } from "../src/data/registries.js";
import { createInitialWorldState } from "../src/state/initialState.js";
import { createStateStore } from "../src/core/stateStore.js";
import { validateDefinitions } from "../src/core/definitionValidator.js";
import { validateWorldState } from "../src/core/validator.js";
import { createPlayerCareer } from "../src/commands/createPlayerCareer.js";
import { advanceWorldDays } from "../src/commands/advanceCareer.js";
import { generateReenlistmentOffers, acceptReenlistmentOffer } from "../src/commands/reenlistment.js";
import { selectCurrentSquad } from "../src/selectors/selectCurrentSquad.js";
import { selectCareerRecord } from "../src/selectors/selectCareerRecord.js";
import { selectOrganizationView } from "../src/selectors/selectOrganizationView.js";
import { selectUnitPersonnel } from "../src/selectors/selectAssignmentView.js";
import { selectServiceCareer } from "../src/selectors/selectServiceCareer.js";
import { migratePayload } from "../src/core/migrations.js";
import { separatePersonAdministrative, processPersonnelAdministration } from "../src/services/personnelAdministration.js";
import { selectPersonnelAdministration } from "../src/selectors/selectPersonnelAdministration.js";
import { assignPersonToBillet } from "../src/commands/assignPersonToBillet.js";


// Catch UI/controller mismatches before packaging: every #id queried by app.js must exist in index.html.
const appSource = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const queriedIds = [...appSource.matchAll(/\$\(\"#([^\"]+)\"\)/g)].map(match => match[1]);
for (const id of queriedIds) assert.match(htmlSource, new RegExp(`id=[\"']${id}[\"']`), `index.html missing #${id} required by app.js`);
assert.match(htmlSource, /WAR SIM · v0\.3\.2/);
assert.match(htmlSource, /id="component-select"/);
assert.match(htmlSource, /id="specialty-select"/);
assert.match(htmlSource, /id="contract-select"/);
assert.match(htmlSource, /id="service-career"/);
assert.match(htmlSource, /id="review-reenlistment"/);
// Regression: browsing sibling squads must not snap back to the player's assignment chain.
assert.doesNotMatch(appSource, /!assignment\.chain\.some\(x => x\.unitId === selectedUnitId\)/);
assert.match(appSource, /const browseChain = organizationChain\(state, indexes, selectedUnitId\)/);


// Regression: schema-6 migrated saves already have a complete legacy squad using
// billet_from_* IDs. The organization expansion must not stack 8 new NPC billets
// on top of it (the v0.3.1 17-person squad bug).
{
  const legacy = createInitialWorldState();
  legacy.schemaVersion = 6;
  legacy.gameVersion = "0.3.0";
  // Remove the expanded organization so migration 6->7 rebuilds it.
  for (const [id, unit] of Object.entries(legacy.entities.units)) {
    if (!["unit_company_001","unit_platoon_001","unit_sq_001"].includes(id)) delete legacy.entities.units[id];
  }
  legacy.entities.units.unit_company_001.childUnitIds = ["unit_platoon_001"];
  legacy.entities.units.unit_platoon_001.childUnitIds = ["unit_sq_001"];
  // Remove non-player-squad expansion billets/personnel.
  for (const [id, billet] of Object.entries(legacy.entities.billets)) {
    if (billet.unitId !== "unit_sq_001") {
      const pid = billet.assignedPersonId;
      if (pid) delete legacy.entities.people[pid];
      delete legacy.entities.billets[id];
    }
  }
  // Convert the 8 canonical NPC billet IDs to the legacy migration naming pattern.
  for (let i=1;i<=8;i++) {
    const oldId=`billet_${i}`, billet=legacy.entities.billets[oldId];
    const newId=`billet_from_slot_${i}`;
    delete legacy.entities.billets[oldId];
    billet.id=newId; legacy.entities.billets[newId]=billet;
    legacy.entities.people[billet.assignedPersonId].affiliation.billetId=newId;
  }
  const payload = migratePayload({ saveFormatVersion:3, saveId:"regression", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.3.0", worldState:legacy });
  const migrated = payload.worldState;
  const squadBillets = Object.values(migrated.entities.billets).filter(b=>b.unitId==="unit_sq_001");
  assert.equal(migrated.schemaVersion, 10);
  assert.equal(squadBillets.length, 9, "legacy migrated squad must remain 9 billets");
}

// Regression: v0.3.1.1/schema-8 saves with generated surname blocks migrate to schema 9
// without changing player identity.
{
  const old = createInitialWorldState();
  old.schemaVersion = 8;
  old.gameVersion = "0.3.1.1";
  const playerLike = old.entities.people[Object.keys(old.entities.people)[0]];
  const oldGeneratedName = playerLike.identity.displayName;
  // Simulate the old bad naming pattern on several generated NPCs.
  for (const person of Object.values(old.entities.people).filter(p => p.id.startsWith("pers_org_")).slice(0, 10)) {
    person.identity.lastName = "Hill";
    person.identity.displayName = `${person.identity.firstName} Hill`;
  }
  const payload = migratePayload({ saveFormatVersion:3, saveId:"identity-repair", createdAt:new Date().toISOString(), savedAt:new Date().toISOString(), gameVersion:"0.3.1.1", worldState:old });
  assert.equal(payload.worldState.schemaVersion, 10);
  const repaired = Object.values(payload.worldState.entities.people).filter(p => p.id.startsWith("pers_org_")).slice(0, 10);
  assert.ok(new Set(repaired.map(p => p.identity.lastName)).size > 5);
}

const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));
assert.equal(registries.components.size, 3);
assert.equal(registries.specialties.size, 3);
assert.equal(registries.contracts.size, 3);

const initial = createInitialWorldState();
assert.equal(initial.playerPersonId, null);
assert.equal(initial.schemaVersion, 10);
assert.equal(initial.gameVersion, "0.3.2");
assert.equal(Object.keys(initial.entities.units).length, 13);
assert.equal(Object.keys(initial.entities.billets).length, 91);
// Generated NPC identities should be deterministic but distributed, not surname blocks.
const generatedPeople = Object.values(initial.entities.people).filter(p => p.id.startsWith("pers_org_"));
const firstPlatoonGenerated = generatedPeople.slice(0, 29);
assert.ok(new Set(firstPlatoonGenerated.map(p => p.identity.lastName)).size >= 12, "generated platoon should have varied surnames");
assert.equal(new Set(generatedPeople.map(p => p.identity.displayName)).size, generatedPeople.length, "generated NPC display names should be unique in the seeded company");

const store = createStateStore(initial);
let validation = validateWorldState(store.getState(), registries);
assert.equal(validation.ok, true, validation.errors.join("\n"));

const created = createPlayerCareer(store, registries, {
  firstName: "Luis", lastName: "Medina", branchId: "branch_army",
  componentId: "component_active", specialtyId: "specialty_army_11b", contractDefinitionId: "contract_army_3y"
});
assert.equal(created.ok, true);
let state = store.getState();
const player = state.entities.people[state.playerPersonId];
assert.equal(player.identity.displayName, "Luis Medina");
assert.equal(player.affiliation.specialtyId, "specialty_army_11b");
assert.equal(player.affiliation.componentId, "component_active");
assert.equal(Object.keys(state.entities.contractRecords).length, 1);
assert.equal(Object.keys(state.entities.servicePeriodRecords).length, 1);
assert.equal(Object.keys(state.entities.orderRecords).length, 1);

validation = validateWorldState(state, registries);
assert.equal(validation.ok, true, validation.errors.join("\n"));

const squad = selectCurrentSquad(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(squad.authorizedStrength, 9);
assert.equal(squad.assignedStrength, 9);
assert.equal(squad.members.find(x => x.isPlayer).role, "Rifleman");
// The player belongs to exactly one squad; sibling squad rosters must not contain the player.
const squadIds = ["unit_sq_11", "unit_sq_001", "unit_sq_13", "unit_sq_21", "unit_sq_22", "unit_sq_23", "unit_sq_31", "unit_sq_32", "unit_sq_33"];
const squadsContainingPlayer = squadIds.filter(unitId => selectUnitPersonnel(state, store.getIndexes(), registries, unitId).some(p => p.isPlayer));
assert.deepEqual(squadsContainingPlayer, ["unit_sq_001"]);
for (const unitId of squadIds) assert.equal(selectUnitPersonnel(state, store.getIndexes(), registries, unitId).length, 9, `${unitId} must have exactly 9 assigned personnel`);
const career = selectCareerRecord(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(career.specialty, "11B · Infantryman");
const company = selectOrganizationView(state, store.getIndexes(), registries, "unit_company_001");
assert.deepEqual(company.childUnitIds, ["unit_platoon_001", "unit_platoon_002", "unit_platoon_003"]);
assert.equal(company.authorizedStrength, 4);
assert.equal(Object.keys(state.entities.people).length, 91);

let service = selectServiceCareer(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.contractDef.id, "contract_army_3y");
assert.equal(service.reenlistmentWindowOpen, false);
advanceWorldDays(store, 930);
assert.ok(Object.keys(store.getState().entities.promotionRecords).length > 0, "NPC lifecycle should record early-career promotions as time advances");
service = selectServiceCareer(store.getState(), store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.reenlistmentWindowOpen, true);
const offers = generateReenlistmentOffers(store, registries, state.playerPersonId);
assert.equal(offers.ok, true);
assert.equal(offers.data.offerIds.length, 3);
const accepted = acceptReenlistmentOffer(store, registries, offers.data.offerIds[1]);
assert.equal(accepted.ok, true);
state = store.getState();
service = selectServiceCareer(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.contract.type, "reenlistment");
assert.equal(service.offers.filter(x => x.status === "open").length, 0);
assert.equal(Object.keys(state.entities.orderRecords).length, 2);
validation = validateWorldState(state, registries);
assert.equal(validation.ok, true, validation.errors.join("\n"));

// Integrity validator must reject impossible organization state instead of silently indexing it.
{
  const broken = structuredClone(state);
  const playerId = broken.playerPersonId;
  const playerBilletId = broken.entities.people[playerId].affiliation.billetId;
  const otherBillet = Object.values(broken.entities.billets).find(b => b.id !== playerBilletId && b.assignedPersonId);
  otherBillet.assignedPersonId = playerId;
  const result = validateWorldState(broken, registries);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(x => x.includes("assigned to multiple billets")));
}
{
  const broken = structuredClone(state);
  const player = broken.entities.people[broken.playerPersonId];
  player.affiliation.unitId = "unit_sq_11";
  const result = validateWorldState(broken, registries);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(x => x.includes("person unit does not match billet unit")));
}

// v0.3.2 personnel administration: vacancy requests persist and replacements arrive after 30 days.
{
  const adminStore = createStateStore(createInitialWorldState());
  createPlayerCareer(adminStore, registries, { firstName:"Admin", lastName:"Test", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_3y" });
  const npc = Object.values(adminStore.getState().entities.people).find(p => p.id !== adminStore.getState().playerPersonId && p.affiliation.unitId === "unit_sq_11");
  const vacatedBilletId = npc.affiliation.billetId;
  adminStore.mutate(draft => { separatePersonAdministrative(draft, npc.id, "administrative_separation"); processPersonnelAdministration(draft); }, ["people","billets","history","orders","notifications","career","admin"]);
  let adminView = selectPersonnelAdministration(adminStore.getState(), adminStore.getIndexes(), registries);
  assert.equal(adminStore.getState().entities.billets[vacatedBilletId].status, "vacant");
  assert.equal(adminView.openRequests.some(r => r.billetId === vacatedBilletId), true);
  assert.equal((adminStore.getIndexes().peopleByUnitId.get("unit_sq_11") ?? []).includes(npc.id), false, "separated personnel must leave active unit indexes");
  advanceWorldDays(adminStore, 30);
  adminView = selectPersonnelAdministration(adminStore.getState(), adminStore.getIndexes(), registries);
  assert.equal(adminStore.getState().entities.billets[vacatedBilletId].status, "filled");
  assert.equal(adminView.openRequests.some(r => r.billetId === vacatedBilletId), false);
  assert.ok(Object.values(adminStore.getState().entities.personnelActionRecords).some(r => r.type === "replacement_arrival"));
  assert.equal(validateWorldState(adminStore.getState(), registries).ok, true);
}

// Player ETS preserves career history, vacates the billet, and does not delete the Person.
{
  const etsStore = createStateStore(createInitialWorldState());
  createPlayerCareer(etsStore, registries, { firstName:"ETS", lastName:"Test", branchId:"branch_army", componentId:"component_active", specialtyId:"specialty_army_11b", contractDefinitionId:"contract_army_3y" });
  advanceWorldDays(etsStore, 1097);
  const etsState = etsStore.getState(), p = etsState.entities.people[etsState.playerPersonId], service = etsState.entities.serviceRecords[p.serviceRecordId];
  assert.equal(p.condition.status, "separated");
  assert.equal(p.affiliation.billetId, null);
  assert.equal(service.serviceStatus, "separated");
  assert.ok(Object.values(etsState.entities.orderRecords).some(o => o.personId === p.id && o.type === "separated"));
  assert.equal(validateWorldState(etsState, registries).ok, true);
}

// Regression: low-level billet assignment must use the real store.mutate API.
{
  const low = createStateStore(createInitialWorldState());
  const npc = low.getState().entities.people.pers_1009;
  const result = assignPersonToBillet(low, registries, npc.id, "billet_player");
  assert.equal(result.ok, true);
  assert.equal(low.getState().entities.billets.billet_player.assignedPersonId, npc.id);
}

console.log("War Sim v0.3.2 military administration smoke test passed");
