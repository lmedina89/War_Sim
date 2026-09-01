/**
 * Unit and Personnel presentation boundary.
 *
 * This module owns DOM rendering for the Unit organization browser, unit roster,
 * Personnel browser, readiness/capability panels, unit history, command-authority
 * controls, and orders. Canonical state selection/mutation stays outside and is
 * supplied through injected dependencies/callbacks.
 */
export function createUnitPersonnelRenderer({
  elements,
  registries,
  selectOrganizationView,
  selectAssignmentView,
  selectUnitPersonnel,
  calculateUnitReadiness,
  selectUnitCapabilityInventory,
  selectGameplay,
  createNamedInsignia,
  metricBlock,
  statLine,
  documentProfile,
  statusProfile,
  statusStamp,
  recordReference,
  readUiArchive,
  archiveUiRecord,
  createHistoryControls,
  unitHistoryPreviewLimit = 5,
  getSelectedUnitId,
  setSelectedUnitId,
  getPersonnelFilterUnitId,
  setPersonnelFilterUnitId,
  onOpenPerson,
  onRender,
  onScheduleUnitDuty,
  onOpenAssignedUnit,
}) {
  const els = elements;

  function descendantUnitIds(state, indexes, unitId) {
    const result = [unitId];
    const queue = [unitId];
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
    const ids = descendantUnitIds(state, indexes, unitId);
    let authorized = 0;
    let assigned = 0;
    for (const id of ids) {
      for (const billetId of indexes.billetsByUnitId.get(id) ?? []) {
        authorized++;
        if (state.entities.billets[billetId]?.assignedPersonId) assigned++;
      }
    }
    return { authorized, assigned, vacancies: authorized - assigned };
  }

  function collectUnitPersonnel(state, indexes, unitId) {
    const seen = new Set();
    const members = [];
    for (const scopedUnitId of descendantUnitIds(state, indexes, unitId)) {
      for (const member of selectUnitPersonnel(state, indexes, registries, scopedUnitId)) {
        if (!seen.has(member.id)) {
          seen.add(member.id);
          members.push(member);
        }
      }
    }
    return members;
  }

  function playerAssignmentUnitId(state, indexes, personId = state.playerPersonId) {
    return selectAssignmentView(state, indexes, registries, personId).chain.at(-1)?.unitId ?? null;
  }

  function organizationChain(state, indexes, unitId) {
    const chain = [];
    let cursor = state.entities.units[unitId];
    while (cursor) {
      chain.unshift(selectOrganizationView(state, indexes, registries, cursor.id));
      cursor = cursor.parentUnitId ? state.entities.units[cursor.parentUnitId] : null;
    }
    return chain;
  }

  function renderUnitRoster(state, indexes, unitId) {
    const unitView = selectOrganizationView(state, indexes, registries, unitId);
    const members = collectUnitPersonnel(state, indexes, unitId);
    const aggregate = aggregateStrength(state, indexes, unitId);
    els.squadMeta.textContent = `${unitView.name}${unitView.childUnitIds.length ? " + subordinate units" : ""} · ${members.length} personnel · ${aggregate.assigned}/${aggregate.authorized} assigned · Readiness ${unitView.readiness}% · Morale ${unitView.morale}% · ${state.world.date}`;
    els.squadBody.replaceChildren(...members.map(member => {
      const tr = document.createElement("tr");
      if (member.isPlayer) tr.className = "player-row";
      const values = [member.rank, `${member.name}${member.isPlayer ? " · YOU" : ""}`, member.billet, `${member.health}%`, `${member.morale}%`, member.weaponName, statusProfile(member.status).label];
      const labels = ["Rank", "Name", "Role", "Health", "Morale", "Weapon", "Status"];
      values.forEach((value, index) => {
        const td = document.createElement("td");
        td.dataset.label = labels[index];
        td.textContent = value;
        tr.appendChild(td);
      });
      tr.addEventListener("click", () => onOpenPerson(member.id));
      tr.classList.add("roster-row");
      return tr;
    }));
  }

  function renderPersonnelBrowser(state, indexes, personId) {
    const ownUnitId = playerAssignmentUnitId(state, indexes, personId);
    let filterUnitId = getPersonnelFilterUnitId();
    if (!filterUnitId || !state.entities.units[filterUnitId]) {
      filterUnitId = ownUnitId;
      setPersonnelFilterUnitId(filterUnitId);
    }
    const current = selectOrganizationView(state, indexes, registries, filterUnitId);
    const personnel = collectUnitPersonnel(state, indexes, filterUnitId);
    els.unitPersonnelMeta.textContent = `${current.name}${current.formationName && current.formationName !== current.name ? ` · ${current.formationName}` : ""}${current.childUnitIds.length ? " + subordinate units" : ""} · ${personnel.length} personnel`;
    els.unitPersonnel.replaceChildren(...personnel.map(member => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `person-card roster-file ${member.isPlayer ? "player-row" : ""}`.trim();
      const rank = document.createElement("span");
      rank.className = "roster-rank";
      rank.textContent = member.rank;
      const identity = document.createElement("div");
      identity.className = "roster-identity";
      const h = document.createElement("strong");
      h.textContent = `${member.name}${member.isPlayer ? " · YOU" : ""}`;
      const role = document.createElement("span");
      role.textContent = member.billet;
      identity.append(h, role);
      const indicators = document.createElement("div");
      indicators.className = "roster-indicators";
      indicators.append(statusStamp(member.status), metricBlock("RDY", `${member.readiness}%`), metricBlock("MOR", `${member.morale}%`));
      card.append(rank, identity, indicators);
      card.addEventListener("click", () => onOpenPerson(member.id));
      return card;
    }));
    els.personnelMyUnit.disabled = filterUnitId === ownUnitId;
  }

  function renderOrganization(state, indexes, personId) {
    const assignment = selectAssignmentView(state, indexes, registries, personId);
    const ownUnitId = assignment.chain.at(-1).unitId;
    let selectedUnitId = getSelectedUnitId();
    if (!selectedUnitId || !state.entities.units[selectedUnitId]) {
      selectedUnitId = ownUnitId;
      setSelectedUnitId(selectedUnitId);
    }

    const current = selectOrganizationView(state, indexes, registries, selectedUnitId);
    const aggregate = aggregateStrength(state, indexes, selectedUnitId);
    const browseChain = organizationChain(state, indexes, selectedUnitId);
    const formationView = assignment.chain.find(item => item.unitId === item.formationUnitId) ?? assignment.chain[0] ?? null;

    const assignmentFormation = document.createElement("div");
    assignmentFormation.className = "assignment-formation";
    if (formationView?.formationInsigniaId) {
      assignmentFormation.append(
        createNamedInsignia(formationView.formationInsigniaId, { title: formationView.formationName }),
        metricBlock("FORMATION", formationView.formationName),
      );
    }
    els.assignmentCard.replaceChildren(
      assignmentFormation,
      statLine("Duty Position", assignment.billetName),
      statLine("Assigned Since", assignment.assignmentStartDate),
      statLine("Chain", assignment.chain.map(x => x.name).join(" › ")),
    );

    els.unitBreadcrumbs.replaceChildren(...browseChain.map(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.name;
      if (item.unitId === selectedUnitId) button.disabled = true;
      button.addEventListener("click", () => {
        setSelectedUnitId(item.unitId);
        onRender();
      });
      return button;
    }));

    els.organizationBrowser.replaceChildren();
    const command = document.createElement("div");
    command.className = "unit-command-header";
    const commandTop = document.createElement("div");
    commandTop.className = "unit-command-identity";
    const commandCopy = document.createElement("div");
    const label = document.createElement("span");
    label.className = "command-label";
    label.textContent = documentProfile("unit_status").classification;
    const unitTitle = document.createElement("strong");
    unitTitle.textContent = current.name.toUpperCase();
    const echelon = document.createElement("span");
    echelon.textContent = `${current.echelon} · ${current.branch}`;
    commandCopy.append(label, unitTitle, echelon);
    if (current.formationInsigniaId) commandTop.append(createNamedInsignia(current.formationInsigniaId, { title: current.formationName }));
    commandTop.append(commandCopy);
    const metrics = document.createElement("div");
    metrics.className = "unit-command-metrics";
    metrics.append(
      metricBlock("PERS", `${aggregate.assigned}/${aggregate.authorized}`),
      metricBlock("VAC", aggregate.vacancies),
      metricBlock("RDY", `${current.readiness}%`),
      metricBlock("MORALE", `${current.morale}%`),
    );
    command.append(commandTop, metrics);
    els.organizationBrowser.append(command);

    if (current.childUnitIds.length) {
      const children = document.createElement("div");
      children.className = "unit-children";
      for (const id of current.childUnitIds) {
        const child = state.entities.units[id];
        const button = document.createElement("button");
        button.type = "button";
        button.className = "unit-child";
        button.textContent = `${child.name} · ${registries.echelons.get(child.echelonId).name}${id === ownUnitId ? " · YOUR UNIT" : ""}`;
        button.addEventListener("click", () => {
          setSelectedUnitId(id);
          onRender();
        });
        children.appendChild(button);
      }
      els.organizationBrowser.append(children);
    }

    els.returnMyUnit.disabled = selectedUnitId === ownUnitId;
    els.viewSelectedPersonnel.textContent = `View ${current.name} in Personnel`;

    const readiness = calculateUnitReadiness(state, indexes, registries, selectedUnitId);
    els.readinessBreakdown.replaceChildren();
    if (readiness) {
      const grid = document.createElement("div");
      grid.className = "readiness-component-grid";
      for (const [key, labelText] of [["personnelFill", "Personnel"], ["individualReadiness", "Individual"], ["training", "Training"], ["cohesion", "Cohesion"], ["equipment", "Equipment"], ["fatigue", "Recovery"]]) {
        const value = readiness.components[key];
        const block = document.createElement("div");
        block.className = "readiness-component";
        block.append(metricBlock(labelText.toUpperCase(), `${value}%`));
        const bar = document.createElement("div");
        bar.className = "mini-readiness-track";
        const fill = document.createElement("span");
        fill.style.setProperty("--value", `${value}%`);
        bar.appendChild(fill);
        block.appendChild(bar);
        grid.appendChild(block);
      }
      const gameplayForTrend = selectGameplay(state, indexes, registries, personId);
      const trend = gameplayForTrend.readinessTrend;
      const overall = document.createElement("div");
      overall.className = "readiness-overall";
      overall.append(metricBlock("CALCULATED READINESS", `${readiness.overall}%`, `${trend.direction.toUpperCase()} ${trend.delta > 0 ? "+" : ""}${trend.delta}`));
      els.readinessBreakdown.append(overall, grid);
    }

    const capability = selectUnitCapabilityInventory(state, indexes, registries, selectedUnitId);
    if (els.unitCapability) {
      els.unitCapability.replaceChildren();
      if (capability) {
        const summary = document.createElement("div");
        summary.className = "capability-summary";
        summary.append(
          metricBlock("DOCTRINE", capability.doctrine?.name ?? "Unspecified"),
          metricBlock("PERSONNEL", String(capability.personCount)),
          metricBlock("EQUIPMENT", `${capability.totals.operational}/${capability.totals.assigned} operational`),
        );
        els.unitCapability.appendChild(summary);
        if (capability.capabilities.length) {
          const grid = document.createElement("div");
          grid.className = "capability-grid";
          for (const item of capability.capabilities) {
            const card = document.createElement("article");
            card.className = "capability-card";
            const h = document.createElement("strong");
            h.textContent = item.name;
            const meta = document.createElement("span");
            meta.textContent = `${item.domain.toUpperCase()} · ${item.operational}/${item.assigned} operational · effectiveness ${item.averageEffectiveness}/100`;
            card.append(h, meta);
            grid.appendChild(card);
          }
          els.unitCapability.appendChild(grid);
        } else {
          const empty = document.createElement("p");
          empty.className = "empty-state compact-empty";
          empty.textContent = "NO DERIVED COMBAT CAPABILITIES FOR THIS UNIT";
          els.unitCapability.appendChild(empty);
        }
        const note = document.createElement("p");
        note.className = "muted capability-note";
        note.textContent = "Battle outcomes are not implemented. This inventory is traceable to actual personnel/equipment and is the foundation for future land, air, sea, explosives, vehicle, sustainment, and mission-capability aggregation.";
        els.unitCapability.appendChild(note);
      }
    }

    const gameplay = selectGameplay(state, indexes, registries, personId);
    els.commandAuthority.replaceChildren();
    const authTitle = document.createElement("strong");
    authTitle.textContent = "Command Authority";
    const authText = document.createElement("p");
    authText.className = "muted";
    authText.textContent = gameplay.authorityIds.length
      ? gameplay.authorityIds.map(id => registries.authorities.get(id).name).join(" · ")
      : "No unit-command authorities are granted by your current billet.";
    els.commandAuthority.append(authTitle, authText);

    if (els.unitHistory) {
      els.unitHistory.replaceChildren();
      const historyIds = [];
      for (const scopedUnitId of descendantUnitIds(state, indexes, selectedUnitId)) {
        historyIds.push(...(indexes.unitEventRecordsByUnitId?.get(scopedUnitId) ?? []));
      }
      const allHistory = historyIds
        .map(id => state.entities.unitEventRecords[id])
        .filter(Boolean)
        .sort((a, b) => (b.elapsedDay ?? 0) - (a.elapsedDay ?? 0) || b.id.localeCompare(a.id));
      const archiveKey = `${personId}:${selectedUnitId}`;
      const archived = readUiArchive("unit-history", archiveKey);
      const visible = allHistory.filter(item => !archived.has(item.id));
      const archivedCount = allHistory.length - visible.length;
      const expanded = els.unitHistory.dataset.expanded === "true";
      const shown = expanded ? visible : visible.slice(0, unitHistoryPreviewLimit);

      if (!shown.length) {
        const p = document.createElement("p");
        p.className = "empty-state military-empty";
        p.textContent = archivedCount ? "ALL RECENT UNIT ACTIVITY IS ARCHIVED FROM THIS VIEW" : "NO SIGNIFICANT UNIT ACTIVITY RECORDED YET";
        els.unitHistory.appendChild(p);
      } else {
        for (const item of shown) {
          const shell = document.createElement("div");
          shell.className = "history-row-shell";
          const row = document.createElement("div");
          row.className = "unit-history-row";
          const time = document.createElement("time");
          time.textContent = item.gameDate;
          const body = document.createElement("div");
          const strong = document.createElement("strong");
          strong.textContent = item.title;
          const span = document.createElement("span");
          span.textContent = item.summary;
          body.append(strong, span);
          row.append(time, body);
          const archive = document.createElement("button");
          archive.type = "button";
          archive.className = "secondary compact-button history-archive";
          archive.textContent = "Archive";
          archive.addEventListener("click", () => archiveUiRecord("unit-history", archiveKey, item.id));
          shell.append(row, archive);
          els.unitHistory.appendChild(shell);
        }
      }
      const controls = createHistoryControls({
        kind: "unit-history",
        personId: archiveKey,
        hiddenCount: Math.max(0, visible.length - unitHistoryPreviewLimit),
        archivedCount,
        expanded,
        onToggle: () => {
          els.unitHistory.dataset.expanded = expanded ? "false" : "true";
          onRender();
        },
      });
      if (controls.childElementCount) els.unitHistory.appendChild(controls);
    }

    if (gameplay.commandDuties.length) {
      const commandGrid = document.createElement("div");
      commandGrid.className = "command-duty-grid";
      for (const duty of gameplay.commandDuties) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary compact-button";
        button.textContent = `Schedule ${duty.shortName}`;
        button.addEventListener("click", () => onScheduleUnitDuty(personId, duty.id));
        commandGrid.appendChild(button);
      }
      els.commandAuthority.appendChild(commandGrid);
    }

    renderUnitRoster(state, indexes, selectedUnitId);
    renderPersonnelBrowser(state, indexes, personId);

    const orderIds = indexes.ordersByPersonId?.get(personId) ?? [];
    els.ordersList.replaceChildren();
    if (!orderIds.length) {
      const p = document.createElement("p");
      p.className = "empty-state military-empty";
      p.textContent = "NO ACTIVE OR HISTORICAL ORDERS RECORDED";
      els.ordersList.append(p);
    } else {
      for (const id of orderIds.slice().reverse()) {
        const order = state.entities.orderRecords[id];
        const card = document.createElement("article");
        card.className = "order-card military-order";
        const mast = document.createElement("div");
        mast.className = "order-masthead";
        const title = document.createElement("span");
        title.textContent = `${documentProfile("order").classification} · ${documentProfile("order").label}`;
        const ref = document.createElement("span");
        ref.textContent = recordReference("order", order.id);
        mast.append(title, ref);
        const h = document.createElement("h3");
        h.textContent = order.title;
        const p1 = document.createElement("p");
        p1.className = "order-summary";
        p1.textContent = order.summary;
        const status = document.createElement("div");
        status.className = "order-status-row";
        status.append(statusStamp(order.status), metricBlock("ISSUED", order.issueDate), metricBlock("EFFECTIVE", order.effectiveDate));
        card.append(mast, h, p1, status);
        if (order.unitId && state.entities.units[order.unitId]) {
          const actions = document.createElement("div");
          actions.className = "order-actions";
          const open = document.createElement("button");
          open.type = "button";
          open.className = "secondary compact-button";
          open.textContent = "Open Assigned Unit";
          open.addEventListener("click", () => onOpenAssignedUnit(order.unitId));
          actions.appendChild(open);
          card.appendChild(actions);
        }
        els.ordersList.append(card);
      }
    }
  }

  return {
    renderOrganization,
    renderPersonnelBrowser,
    renderUnitRoster,
    playerAssignmentUnitId,
  };
}
