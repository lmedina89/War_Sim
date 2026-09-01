export function createPersonProfileUniformRenderer({
  registries,
  selectSoldierIdentity,
  createInsignia,
  createRankInsignia,
  awardDeviceLabel,
}) {
  function render(state, indexes, personId) {
    const identity = selectSoldierIdentity(state, indexes, registries, personId);
    const person = state.entities.people[personId];
    const section = document.createElement("section");
    section.className = "profile-section service-file-section npc-uniform-preview";
    section.hidden = true;

    const head = document.createElement("div");
    head.className = "identity-subhead";
    const title = document.createElement("h3");
    title.textContent = "Service Uniform";
    const meta = document.createElement("span");
    meta.textContent = `${identity.rank} · ${identity.specialty}`;
    head.append(title, meta);

    const blouse = document.createElement("div");
    blouse.className = "uniform-blouse npc-uniform-blouse";
    const nameTape = document.createElement("div");
    nameTape.className = "uniform-name-tape";
    nameTape.textContent = identity.name.split(" ").at(-1)?.toUpperCase() ?? identity.name.toUpperCase();
    const armyTape = document.createElement("div");
    armyTape.className = "uniform-army-tape";
    armyTape.textContent = "U.S. ARMY";
    const rankMark = document.createElement("div");
    rankMark.className = "uniform-rank-mark";
    rankMark.append(createRankInsignia(registries.ranks.get(person.affiliation.rankId)));

    const ribbons = document.createElement("div");
    ribbons.className = "uniform-ribbon-rack";
    for (const item of identity.ribbons) {
      const slot = document.createElement("span");
      slot.className = "uniform-ribbon-slot";
      slot.append(createInsignia(item.definition));
      const device = awardDeviceLabel(item);
      if (device) {
        const label = document.createElement("small");
        label.className = "insignia-device";
        label.textContent = device;
        slot.appendChild(label);
      }
      ribbons.appendChild(slot);
    }
    if (!identity.ribbons.length) {
      const empty = document.createElement("span");
      empty.className = "uniform-empty-slot";
      empty.textContent = "NO RIBBONS";
      ribbons.appendChild(empty);
    }

    const badges = document.createElement("div");
    badges.className = "uniform-badge-rack";
    for (const item of identity.badges) {
      const slot = document.createElement("span");
      slot.className = "uniform-badge-slot";
      slot.append(createInsignia(item.definition));
      badges.appendChild(slot);
    }
    if (identity.rifleQualification) {
      const slot = document.createElement("span");
      slot.className = "uniform-badge-slot qualification-insignia";
      slot.append(createInsignia(null, {
        qualificationResult: identity.rifleQualification.result,
        badgeClasp: identity.rifleQualification.badgeClasp ?? "RIFLE",
      }));
      badges.appendChild(slot);
    }

    const tabs = document.createElement("div");
    tabs.className = "uniform-tab-rack";
    for (const item of identity.tabs) tabs.append(createInsignia(item.definition));

    blouse.append(nameTape, armyTape, rankMark, tabs, ribbons, badges);
    const note = document.createElement("p");
    note.className = "muted compact-note";
    note.textContent = "This Tier 1 Soldier's uniform is generated only from that Soldier's canonical rank, awards, badges, and qualifications.";
    section.append(head, blouse, note);
    return section;
  }

  return { render };
}
