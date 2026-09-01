export function createAdministrationRenderer({
  elements,
  registries,
  selectPersonnelAdministration,
  renderList,
}) {
  function render(state, indexes) {
    const view = selectPersonnelAdministration(state, indexes, registries);

    elements.administrationSummary.replaceChildren();
    const summary = document.createElement("div");
    summary.className = "status-chips";

    const summaryItems = [
      `${view.counts.active ?? 0} active`,
      `${view.vacantBillets.length} vacancies`,
      `${view.openRequests.length} replacement requests`,
      `${view.counts.separated ?? 0} separated`,
    ];

    for (const text of summaryItems) {
      const chip = document.createElement("span");
      chip.className = "status-chip";
      chip.textContent = text;
      summary.appendChild(chip);
    }
    elements.administrationSummary.appendChild(summary);

    renderList(
      elements.replacementRequests,
      view.openRequests.map(request => `${request.unitName} · ${request.billetName} · requested ${request.requestedDate}`),
      view.vacantBillets.length
        ? `${view.vacantBillets.length} vacancy/vacancies are awaiting request processing.`
        : "No open replacement requests.",
    );

    renderList(
      elements.personnelActions,
      view.actions.map(action => `${action.effectiveDate} · ${action.personName} · ${action.type.replaceAll("_", " ")} · ${action.reason.replaceAll("_", " ")}`),
      "No personnel actions recorded yet.",
    );
  }

  return { render };
}
