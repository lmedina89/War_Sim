export function createInboxRenderer({
  elements,
  recordReference,
  onOpenOpportunity,
  onAcknowledge,
  onArchive,
  onMarkReadQuiet,
}) {
  return function renderInbox({ state, notices, pendingDecisionCount = 0 }) {
    const unread = notices.filter(n => n.readAtElapsedDay == null);
    const read = notices.filter(n => n.readAtElapsedDay != null);
    const attentionCount = unread.length + pendingDecisionCount;

    elements.unreadBadge.hidden = unread.length === 0;
    elements.unreadBadge.textContent = String(unread.length);
    elements.navCareerBadge.hidden = attentionCount === 0;
    elements.navCareerBadge.textContent = attentionCount > 99 ? "99+" : String(attentionCount);
    if (elements.careerTabInboxBadge) {
      elements.careerTabInboxBadge.hidden = unread.length === 0;
      elements.careerTabInboxBadge.textContent = unread.length > 99 ? "99+" : String(unread.length);
    }
    elements.markAllRead.disabled = unread.length === 0;
    elements.clearRead.disabled = read.length === 0;
    elements.careerInbox.replaceChildren();

    if (!notices.length) {
      const p = document.createElement("p");
      p.className = "empty-state military-empty";
      p.textContent = "NO ACTIVE PERSONNEL DISPATCHES";
      elements.careerInbox.appendChild(p);
      return;
    }

    const list = document.createElement("div");
    list.className = "inbox-list dispatch-list";
    for (const notice of notices.slice(0, 30)) {
      const item = document.createElement("article");
      item.className = `inbox-item dispatch-card ${notice.readAtElapsedDay == null ? "unread" : "read"}`.trim();
      const rail = document.createElement("div");
      rail.className = "dispatch-rail";
      const ref = document.createElement("span");
      ref.textContent = recordReference("notification", notice.id);
      const stateLabel = document.createElement("span");
      stateLabel.textContent = notice.readAtElapsedDay == null ? "NEW" : "READ";
      rail.append(ref, stateLabel);

      const meta = document.createElement("div");
      meta.className = "inbox-meta";
      const type = document.createElement("span");
      const date = document.createElement("span");
      type.textContent = notice.type.replaceAll("_", " ").toUpperCase();
      date.textContent = notice.gameDate;
      meta.append(type, date);

      const h = document.createElement("h3");
      h.textContent = notice.title;
      const p = document.createElement("p");
      p.textContent = notice.message;
      item.append(rail, meta, h, p);

      const actions = document.createElement("div");
      actions.className = "notice-actions";
      const opportunityRecordId = notice.references?.opportunityRecordId ?? null;
      if (opportunityRecordId && state.entities.opportunityRecords?.[opportunityRecordId]) {
        const open = document.createElement("button");
        open.type = "button";
        open.className = "compact-button";
        open.textContent = "Open Opportunity";
        open.addEventListener("click", () => {
          if (notice.readAtElapsedDay == null) onMarkReadQuiet(notice.id);
          onOpenOpportunity(opportunityRecordId);
        });
        actions.appendChild(open);
      }
      if (notice.readAtElapsedDay == null) {
        const readButton = document.createElement("button");
        readButton.type = "button";
        readButton.className = "secondary compact-button";
        readButton.textContent = "Acknowledge";
        readButton.addEventListener("click", () => onAcknowledge(notice.id));
        actions.appendChild(readButton);
      } else {
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "secondary compact-button";
        clear.textContent = "Archive";
        clear.addEventListener("click", () => onArchive(notice.id));
        actions.appendChild(clear);
      }
      item.appendChild(actions);
      list.appendChild(item);
    }
    elements.careerInbox.appendChild(list);
  };
}
