export function createRelationshipsRenderer({ container, relationshipBands, onOpenPerson }) {
  function relationshipBand(trust) {
    return relationshipBands.values().find(band => trust >= band.minimumTrust && trust <= band.maximumTrust)
      ?? relationshipBands.get("relationship_neutral");
  }

  function meter(label, value, minimum = 0, maximum = 100, { signed = false } = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `relationship-meter${signed ? " signed-meter" : ""}`;
    const head = document.createElement("div");
    head.className = "meter-head";
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    name.textContent = label;
    amount.textContent = signed && value > 0 ? `+${value}` : String(value);
    head.append(name, amount);
    const track = document.createElement("div");
    track.className = "meter-track";
    const fill = document.createElement("div");
    fill.className = "meter-fill";
    if (signed) {
      const numeric = Math.max(-100, Math.min(100, Number(value) || 0));
      const displacement = Math.sqrt(Math.abs(numeric) / 100) * 50;
      fill.classList.add(numeric < 0 ? "negative" : "positive");
      fill.style.setProperty("--signed-width", `${displacement}%`);
      track.appendChild(fill);
      const center = document.createElement("span");
      center.className = "meter-center";
      center.setAttribute("aria-hidden", "true");
      track.appendChild(center);
    } else {
      const percent = Math.max(0, Math.min(100, ((Number(value) - minimum) / (maximum - minimum)) * 100));
      fill.style.setProperty("--meter", `${percent}%`);
      track.appendChild(fill);
    }
    wrapper.append(head, track);
    return wrapper;
  }

  return function renderRelationships(relationships) {
    container.replaceChildren();
    if (!relationships.length) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = "No relationship records yet.";
      container.appendChild(p);
      return;
    }
    for (const rel of relationships) {
      const band = relationshipBand(rel.trust);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `relationship-card tone-${band.tone}`;
      const top = document.createElement("div");
      top.className = "relationship-card-head";
      const identity = document.createElement("div");
      const h = document.createElement("strong");
      h.textContent = `${rel.otherRank} ${rel.otherName}`;
      const role = document.createElement("span");
      role.textContent = `${rel.otherRole} · ${rel.relationshipType}`;
      identity.append(h, role);
      const badge = document.createElement("span");
      badge.className = `relationship-badge tone-${band.tone}`;
      badge.textContent = band.label;
      top.append(identity, badge);
      const meters = document.createElement("div");
      meters.className = "relationship-meters";
      meters.append(
        meter("Trust", rel.trust, -100, 100, { signed: true }),
        meter("Respect", rel.respect ?? 0, -100, 100, { signed: true }),
        meter("Rapport", rel.rapport ?? 0, -100, 100, { signed: true }),
      );
      const context = document.createElement("div");
      context.className = "relationship-context";
      if (rel.personalityTraits?.length) {
        const traits = document.createElement("small");
        traits.textContent = `Traits: ${rel.personalityTraits.join(" · ")}`;
        context.appendChild(traits);
      }
      if (rel.memories?.length) {
        const history = document.createElement("div");
        history.className = "relationship-history";
        const historyLabel = document.createElement("small");
        historyLabel.className = "relationship-history-label";
        historyLabel.textContent = "Recent relationship changes";
        history.appendChild(historyLabel);
        for (const item of rel.memories.slice(0, 3)) {
          const row = document.createElement("small");
          row.className = "relationship-memory";
          const changes = [["Trust", item.trustDelta], ["Respect", item.respectDelta], ["Rapport", item.rapportDelta]]
            .filter(([, delta]) => Number(delta) !== 0)
            .map(([name, delta]) => `${name} ${Number(delta) > 0 ? "+" : ""}${delta}`)
            .join(" · ");
          row.textContent = `${item.date ?? "—"} · ${item.summary}${changes ? ` · ${changes}` : ""}`;
          history.appendChild(row);
        }
        context.appendChild(history);
      }
      card.append(top, meters, context);
      card.addEventListener("click", () => onOpenPerson(rel.otherPersonId));
      container.appendChild(card);
    }
  };
}
