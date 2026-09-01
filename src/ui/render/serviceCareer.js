export function createServiceCareerRenderer({
  elements,
  registries,
  selectServiceCareer,
  statLine,
  renderList,
  onAcceptOffer,
}) {
  function render(state, indexes, personId) {
    const view = selectServiceCareer(state, indexes, registries, personId);
    const contract = view.contract;
    elements.serviceCareer.replaceChildren(
      statLine("Component", view.component.name),
      statLine("MOS", `${view.specialty.code} · ${view.specialty.name}`),
      statLine("Career Field", view.specialty.careerField),
      statLine("Contract", view.contractDef?.name ?? "—"),
      statLine("Contract Start", contract?.startDate ?? "—"),
      statLine("ETS / Contract End", contract?.endDate ?? "—"),
      statLine("Days Remaining", view.daysRemaining == null ? "—" : view.daysRemaining),
      statLine("Contract Bonus", contract ? `$${contract.bonus.toLocaleString()}` : "$0")
    );
    elements.reviewReenlistment.disabled = !view.reenlistmentWindowOpen;
    elements.reviewReenlistment.textContent = view.reenlistmentWindowOpen
      ? "Review Reenlistment Options"
      : `Reenlistment Window ${view.daysRemaining > 180 ? `in ${view.daysRemaining - 180} days` : "Closed"}`;
    elements.reenlistmentOffers.replaceChildren();
    const openOffers = view.offers.filter(item => item.status === "open");
    if (!openOffers.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = view.reenlistmentWindowOpen
        ? "No active offers yet. Review options to generate them."
        : "Reenlistment offers appear within 180 days of ETS.";
      elements.reenlistmentOffers.appendChild(p);
    } else {
      for (const offer of openOffers) {
        const card = document.createElement("article"); card.className = "offer-card";
        const h = document.createElement("h3"); h.textContent = offer.contractName;
        const p = document.createElement("p"); p.textContent = `Retain ${view.specialty.code} ${view.specialty.name} · ${view.component.name}`;
        const bonus = document.createElement("p"); bonus.className = "offer-bonus"; bonus.textContent = `$${offer.bonus.toLocaleString()} bonus`;
        const accept = document.createElement("button"); accept.type = "button"; accept.textContent = "Accept Offer";
        accept.addEventListener("click", () => onAcceptOffer(offer.id));
        card.append(h, p, bonus, accept);
        elements.reenlistmentOffers.appendChild(card);
      }
    }
    const history = view.periods.map(item => `${item.startDate} → ${item.endDate ?? "Present"} · ${item.branchName} · ${item.componentName} · ${item.specialtyName}`);
    renderList(elements.careerFramework, history, "No service periods recorded.");
  }
  return Object.freeze({ render });
}
