export function createPresentationToolkit(registries) {
  function statLine(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "statline";
    const key = document.createElement("span");
    const val = document.createElement("strong");
    key.textContent = label;
    val.textContent = String(value);
    wrapper.append(key, val);
    return wrapper;
  }

  function progressRow(label, value, max) {
    const safeMax = Math.max(1, Number(max) || 1);
    const safeValue = Math.max(0, Number(value) || 0);
    const percent = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
    const wrapper = document.createElement("div");
    wrapper.className = "progress-row";
    const head = document.createElement("div");
    head.className = "progress-row-head";
    const key = document.createElement("span");
    const val = document.createElement("strong");
    key.textContent = label;
    val.textContent = `${safeValue.toLocaleString()} / ${safeMax.toLocaleString()}`;
    head.append(key, val);
    const track = document.createElement("div");
    track.className = "progress-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", label);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(safeMax));
    track.setAttribute("aria-valuenow", String(safeValue));
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.setProperty("--progress", `${percent}%`);
    track.appendChild(fill);
    wrapper.append(head, track);
    return wrapper;
  }

  function renderList(container, items, emptyText) {
    container.replaceChildren();
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = emptyText;
      container.appendChild(p);
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "compact-list";
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
    container.appendChild(ul);
  }

  function resolveRankName(rankId) {
    if (!rankId) return "—";
    const rank = registries.ranks.get(rankId);
    return `${rank.abbreviation} · ${rank.name}`;
  }

  function resolveBranchName(branchId) {
    return branchId ? registries.branches.get(branchId).name : "—";
  }

  function formatSavedAt(value) {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch {
      return value ?? "—";
    }
  }

  function performanceProfile(rating) {
    return registries.performanceRatings.has(rating)
      ? registries.performanceRatings.get(rating)
      : registries.performanceRatings.get("satisfactory");
  }

  function feedbackProfile(definition) {
    return definition?.presentationId && registries.feedbackPresentations.has(definition.presentationId)
      ? registries.feedbackPresentations.get(definition.presentationId)
      : registries.feedbackPresentations.get("feedback_routine");
  }

  function humanizeStatus(value) {
    return String(value ?? "unknown").replaceAll("_", " ");
  }

  function statusProfile(status) {
    return registries.statusPresentations.has(status)
      ? registries.statusPresentations.get(status)
      : { id: String(status ?? "unknown"), label: humanizeStatus(status).toUpperCase(), tone: "routine", priority: 0 };
  }

  function documentProfile(id) {
    return registries.documentPresentations.get(id);
  }

  function compactReference(prefix, id) {
    const text = String(id ?? "record");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
  }

  function statusStamp(status, extraClass = "") {
    const profile = statusProfile(status);
    const stamp = document.createElement("span");
    stamp.className = `mil-status-stamp tone-${profile.tone} ${extraClass}`.trim();
    stamp.textContent = profile.label;
    stamp.dataset.status = status;
    return stamp;
  }

  function metricBlock(label, value, subtext = "") {
    const box = document.createElement("div");
    box.className = "mil-metric";
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = String(value);
    box.append(key, val);
    if (subtext) {
      const sub = document.createElement("small");
      sub.textContent = subtext;
      box.appendChild(sub);
    }
    return box;
  }

  function recordReference(documentId, entityId) {
    const profile = documentProfile(documentId);
    return compactReference(profile?.prefix ?? "REC", entityId);
  }

  function formatMilitaryDate(isoDate) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return String(isoDate ?? "—");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  }

  return {
    statLine,
    progressRow,
    renderList,
    resolveRankName,
    resolveBranchName,
    formatSavedAt,
    performanceProfile,
    feedbackProfile,
    humanizeStatus,
    statusProfile,
    documentProfile,
    compactReference,
    statusStamp,
    metricBlock,
    recordReference,
    formatMilitaryDate,
  };
}
