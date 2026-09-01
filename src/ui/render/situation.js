export function createSituationRenderer({
  elements,
  registries,
  selectAssignmentView,
  selectOrganizationView,
  selectGameplay,
  createNamedInsignia,
  statusStamp,
  metricBlock,
  formatMilitaryDate,
}) {
  const { persistentWorldContext, situationStrip } = elements;

  function descendantUnitIds(indexes, unitId) {
    const result = [unitId], queue = [unitId];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      for (const child of indexes.unitsByParentUnitId.get(current) ?? []) {
        result.push(child);
        queue.push(child);
      }
    }
    return result;
  }

  function aggregateStrength(state, indexes, unitId) {
    let authorized = 0, assigned = 0;
    for (const id of descendantUnitIds(indexes, unitId)) {
      for (const billetId of indexes.billetsByUnitId.get(id) ?? []) {
        authorized++;
        if (state.entities.billets[billetId]?.assignedPersonId) assigned++;
      }
    }
    return { authorized, assigned };
  }

  function renderPersistentWorldContext(state) {
    if (!persistentWorldContext) return;
    if (!state.playerPersonId) {
      persistentWorldContext.textContent = "";
      return;
    }
    const phaseId = state.world.scheduler?.trainingPhaseId ?? "training_phase_garrison";
    const phase = registries.trainingPhases.has(phaseId) ? registries.trainingPhases.get(phaseId) : null;
    const date = document.createElement("time");
    date.dateTime = state.world.date;
    date.textContent = formatMilitaryDate(state.world.date);
    const separator = document.createElement("span");
    separator.textContent = "·";
    const phaseLabel = document.createElement("span");
    phaseLabel.textContent = phase?.shortLabel ?? phase?.name ?? "CAREER";
    persistentWorldContext.replaceChildren(date, separator, phaseLabel);
  }

  function renderSituation(state, indexes, personId) {
    const person = state.entities.people[personId];
    if (!person) {
      situationStrip.replaceChildren();
      return;
    }
    const rank = registries.ranks.get(person.affiliation.rankId);
    const specialty = registries.specialties.get(person.affiliation.specialtyId);
    const assignment = selectAssignmentView(state, indexes, registries, personId);
    const ownUnitId = assignment.chain.at(-1)?.unitId;
    const unit = ownUnitId ? selectOrganizationView(state, indexes, registries, ownUnitId) : null;
    const strength = ownUnitId ? aggregateStrength(state, indexes, ownUnitId) : { assigned: 0, authorized: 0 };

    const identity = document.createElement("div");
    identity.className = "situation-identity";
    const copy = document.createElement("div");
    copy.className = "situation-identity-copy";
    const kicker = document.createElement("span");
    kicker.className = "situation-kicker";
    kicker.textContent = "CURRENT SITUATION";
    const title = document.createElement("strong");
    title.textContent = `${rank.abbreviation} ${person.identity.displayName}`;
    const sub = document.createElement("span");
    sub.textContent = `${specialty.code} ${specialty.name} · ${assignment.chain.map(item => item.name).join(" / ")}`;
    copy.append(kicker, title, sub);
    const formationView = assignment.chain.find(item => item.formationInsigniaId) ?? null;
    if (formationView?.formationInsigniaId) {
      identity.append(copy, createNamedInsignia(formationView.formationInsigniaId, { title: formationView.formationName }));
    } else {
      identity.append(copy);
    }

    const metrics = document.createElement("div");
    metrics.className = "situation-metrics";
    const gameplay = selectGameplay(state, indexes, registries, personId);
    const dutyLabel = gameplay?.currentDuty?.shortName ?? "AVAILABLE";
    metrics.append(
      statusStamp(person.condition.status),
      metricBlock("DATE", state.world.date),
      metricBlock("DUTY", dutyLabel),
      metricBlock("PERS", `${strength.assigned}/${strength.authorized}`),
      metricBlock("RDY", unit ? `${unit.readiness}%` : "—"),
      metricBlock("MORALE", unit ? `${unit.morale}%` : "—"),
    );
    situationStrip.replaceChildren(identity, metrics);
  }

  return { renderPersistentWorldContext, renderSituation };
}
