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
import { selectServiceCareer } from "../src/selectors/selectServiceCareer.js";


// Catch UI/controller mismatches before packaging: every #id queried by app.js must exist in index.html.
const appSource = fs.readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const queriedIds = [...appSource.matchAll(/\$\(\"#([^\"]+)\"\)/g)].map(match => match[1]);
for (const id of queriedIds) assert.match(htmlSource, new RegExp(`id=[\"']${id}[\"']`), `index.html missing #${id} required by app.js`);
assert.match(htmlSource, /WAR SIM · v0\.3\.0/);
assert.match(htmlSource, /id="component-select"/);
assert.match(htmlSource, /id="specialty-select"/);
assert.match(htmlSource, /id="contract-select"/);
assert.match(htmlSource, /id="service-career"/);
assert.match(htmlSource, /id="review-reenlistment"/);

const defs = validateDefinitions(registries);
assert.equal(defs.ok, true, defs.errors.join("\n"));
assert.equal(registries.components.size, 3);
assert.equal(registries.specialties.size, 3);
assert.equal(registries.contracts.size, 3);

const initial = createInitialWorldState();
assert.equal(initial.playerPersonId, null);
assert.equal(initial.schemaVersion, 6);
assert.equal(initial.gameVersion, "0.3.0");
assert.equal(Object.keys(initial.entities.units).length, 3);
assert.equal(Object.keys(initial.entities.billets).length, 9);

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
const career = selectCareerRecord(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(career.specialty, "11B · Infantryman");
const company = selectOrganizationView(state, store.getIndexes(), registries, "unit_company_001");
assert.deepEqual(company.childUnitIds, ["unit_platoon_001"]);

let service = selectServiceCareer(state, store.getIndexes(), registries, state.playerPersonId);
assert.equal(service.contractDef.id, "contract_army_3y");
assert.equal(service.reenlistmentWindowOpen, false);
advanceWorldDays(store, 930);
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

console.log("War Sim v0.3.0 career contracts smoke test passed");
