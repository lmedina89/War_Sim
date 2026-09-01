const DISPLAYABLE_TYPES = new Set(["career_opportunity", "qualification_completed", "award_earned", "promotion", "memorial"]);

export function createAchievementDialogController({
  elements = {},
  getNoticesByIds,
  markRead,
  openOpportunity,
  isBlocked = () => false,
  defer = queueMicrotask,
} = {}) {
  const { dialog, type, title, message, ok } = elements;
  if (!dialog || !type || !title || !message || !ok) throw new Error("Achievement dialog controller requires its dialog elements.");
  if (typeof getNoticesByIds !== "function") throw new Error("Achievement dialog controller requires getNoticesByIds().");

  const queue = [];
  let acknowledgementLocked = false;
  const ACKNOWLEDGEMENT_GUARD_MS = 450;

  function showNext() {
    if (dialog.open || isBlocked() || queue.length === 0) return;
    const notice = queue.shift();
    type.textContent = notice.type.replaceAll("_", " ").toUpperCase();
    title.textContent = notice.title;
    message.textContent = notice.message;
    dialog.dataset.notificationId = notice.id;
    dialog.dataset.opportunityRecordId = notice.references?.opportunityRecordId ?? "";
    ok.textContent = notice.references?.opportunityRecordId ? "Open Opportunity" : "Continue";
    dialog.showModal();
  }

  function enqueue(ids) {
    const notices = getNoticesByIds(ids ?? []).filter(notice => DISPLAYABLE_TYPES.has(notice.type));
    queue.push(...notices);
    defer(showNext);
  }

  ok.addEventListener("click", () => {
    if (acknowledgementLocked) return;
    acknowledgementLocked = true;
    setTimeout(() => { acknowledgementLocked = false; }, ACKNOWLEDGEMENT_GUARD_MS);
    const id = dialog.dataset.notificationId;
    const opportunityRecordId = dialog.dataset.opportunityRecordId;
    if (id && typeof markRead === "function") {
      try { markRead(id); } catch {}
    }
    dialog.close();
    if (opportunityRecordId && typeof openOpportunity === "function") openOpportunity(opportunityRecordId);
    showNext();
  });

  return { enqueue, showNext, pendingCount: () => queue.length };
}
