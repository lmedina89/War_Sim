const PERCENT_KEYS = new Set(["health", "morale", "readiness", "unitReadiness", "unitCohesion"]);
const RESULT_LABELS = {
  experience: "Experience",
  prestige: "Prestige",
  health: "Health",
  morale: "Morale",
  readiness: "Readiness",
  fatigue: "Fatigue",
  unitReadiness: "Unit Readiness",
  unitCohesion: "Unit Cohesion",
};

export function createResultDialogController({
  elements = {},
  getState,
  getActivityDefinition,
  getDutyDefinition,
  getSkillName,
  getGameplayEventDefinition,
  getPerformanceRatingLabel,
  performanceProfile,
  feedbackProfile,
  compactReference,
  recordReference,
  statusStamp,
  metricBlock,
} = {}) {
  const { dialog, reference, kicker, title, body } = elements;
  if (!dialog || !reference || !kicker || !title || !body) throw new Error("Result dialog controller requires dialog, reference, kicker, title, and body elements.");
  if (typeof getState !== "function") throw new Error("Result dialog controller requires getState().");

  const resultLabel = key => RESULT_LABELS[key] ?? key;
  const formatResultValue = (key, value) => PERCENT_KEYS.has(key) ? `${value}%` : String(value);

  function appendChangeRow(container, { label, before, after, delta, key = "" }) {
    const row = document.createElement("div");
    row.className = `aar-change ${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}`;
    const name = document.createElement("strong"); name.textContent = label;
    const values = document.createElement("span"); values.className = "aar-change-values"; values.textContent = `${formatResultValue(key, before)} → ${formatResultValue(key, after)}`;
    const change = document.createElement("b"); change.textContent = `${delta > 0 ? "+" : ""}${delta}`;
    row.append(name, values, change);
    container.appendChild(row);
  }

  function appendGameplayEvent(state, eventRecordId) {
    if (!eventRecordId) return;
    const ev = state.entities.gameplayEventRecords[eventRecordId];
    const definition = ev ? getGameplayEventDefinition(ev.definitionId) : null;
    if (!definition) return;
    const feedback = feedbackProfile(definition);
    const box = document.createElement("section"); box.className = `aar-event tone-${feedback.tone}`;
    const eventKicker = document.createElement("span"); eventKicker.className = "event-kicker"; eventKicker.textContent = feedback.label;
    const eventTitle = document.createElement("strong"); eventTitle.textContent = definition.title;
    const eventMessage = document.createElement("p"); eventMessage.textContent = definition.message;
    box.append(eventKicker, eventTitle, eventMessage);
    body.appendChild(box);
  }

  function showActivity(activityRecordId) {
    const state = getState();
    const record = state.entities.activityRecords[activityRecordId];
    if (!record) return;
    const definition = getActivityDefinition(record.activityDefinitionId);
    const perf = performanceProfile(record.performanceRating ?? "satisfactory");
    dialog.dataset.tone = perf.tone;
    reference.textContent = recordReference("aar", record.id);
    kicker.textContent = "AFTER ACTION REPORT";
    title.textContent = definition.name;
    body.replaceChildren();

    const header = document.createElement("div"); header.className = "aar-header";
    const date = document.createElement("span"); date.className = "aar-date"; date.textContent = `${record.startDate} → ${record.endDate}`;
    if (record.qualificationResult) {
      const q = record.qualificationResult;
      const grade = document.createElement("span"); grade.className = `performance-badge tone-${q.qualified ? "good" : "warning"}`; grade.textContent = `${q.label} · ${q.score}/${q.maxScore}`;
      header.append(grade, date); body.appendChild(header);
      const box = document.createElement("div"); box.className = "aar-performance";
      box.append(statusStamp(q.qualified ? "filled" : "blocked"), metricBlock("QUALIFICATION RESULT", q.qualified ? "QUALIFIED" : "UNQUALIFIED"), metricBlock("TRAINING PERFORMANCE", record.performanceScore != null ? `${perf.label} · ${record.performanceScore}/100` : perf.label));
      body.appendChild(box);
      const desc = document.createElement("p"); desc.className = "performance-description"; desc.textContent = q.qualified ? "Weapon qualification standard met. The 0–100 training score is supporting performance context." : "Weapon qualification standard was not met. The 0–100 training score does not override the qualification result.";
      body.appendChild(desc);
    } else {
      const grade = document.createElement("span"); grade.className = `performance-badge tone-${perf.tone}`; grade.textContent = record.performanceScore != null ? `${perf.label} · ${record.performanceScore}/100` : perf.label;
      header.append(grade, date);
      const desc = document.createElement("p"); desc.className = "performance-description"; desc.textContent = perf.description;
      body.append(header, desc);
    }

    const participation = document.createElement("div"); participation.className = "aar-participation";
    const scope = record.participantScope ?? "individual";
    const participantCount = (record.participantPersonIds ?? [record.personId]).length;
    participation.append(metricBlock("ACTIVITY SOURCE", record.sourceType === "player_activity" ? "PLAYER INITIATED" : String(record.sourceType ?? "ACTIVITY").replaceAll("_", " ").toUpperCase()), metricBlock("PARTICIPATION", scope === "individual" && participantCount === 1 ? "PLAYER ONLY" : `${scope.toUpperCase()} · ${participantCount} PERSONNEL`));
    body.appendChild(participation);

    const changes = document.createElement("div"); changes.className = "aar-change-grid";
    for (const [key, delta] of Object.entries(record.deltas ?? {})) {
      if (key === "skills" || !delta) continue;
      const before = record.before?.[key], after = record.after?.[key];
      if (before != null && after != null) appendChangeRow(changes, { label: resultLabel(key), before, after, delta, key });
    }
    for (const [id, delta] of Object.entries(record.deltas?.skills ?? {})) {
      if (!delta) continue;
      const before = record.before?.skills?.[id], after = record.after?.skills?.[id];
      if (before != null && after != null) appendChangeRow(changes, { label: getSkillName(id) ?? id, before, after, delta, key: "skill" });
    }
    if (changes.childElementCount) {
      const heading = document.createElement("h3"); heading.className = "aar-subheading"; heading.textContent = "Recorded Changes";
      body.append(heading, changes);
    } else {
      const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "No measurable changes recorded.";
      body.appendChild(empty);
    }
    if (record.repetitionMultiplier != null && record.repetitionMultiplier < 1) {
      const rep = document.createElement("p"); rep.className = "aar-advisory"; rep.textContent = `Repeated training reduced learning efficiency to ${Math.round(record.repetitionMultiplier * 100)}%. Rotate activities for better gains.`;
      body.appendChild(rep);
    }
    appendGameplayEvent(state, record.eventRecordId);
    dialog.showModal();
  }

  function showDuty(scheduleRecordId) {
    const state = getState();
    const record = state.entities.scheduleRecords[scheduleRecordId];
    if (!record) return;
    const duty = getDutyDefinition(record.dutyDefinitionId);
    const perf = performanceProfile(record.performanceRating ?? "satisfactory");
    dialog.dataset.tone = perf.tone;
    reference.textContent = compactReference("DUTY", record.id);
    kicker.textContent = "UNIT TRAINING AAR";
    title.textContent = duty.name;
    body.replaceChildren();
    const header = document.createElement("div"); header.className = "aar-performance";
    if (record.qualificationResult && typeof record.qualificationResult === "object") {
      const q = record.qualificationResult;
      header.append(statusStamp(q.qualified ? "filled" : "blocked"), metricBlock("QUALIFICATION", `${q.label} · ${q.score}/${q.maxScore}`), metricBlock("TRAINING PERFORMANCE", record.performanceScore != null ? `${getPerformanceRatingLabel(record.performanceRating) ?? record.performanceRating} · ${record.performanceScore}/100` : "—"));
    } else {
      header.append(statusStamp(record.performanceRating ?? "completed"), metricBlock("SCORE", record.performanceScore != null ? `${record.performanceScore}/100` : "—"), metricBlock("PERIOD", record.startDate === record.endDate ? record.startDate : `${record.startDate} → ${record.endDate}`));
    }
    body.appendChild(header);
    const participantCount = (record.participantPersonIds ?? []).length;
    const participation = document.createElement("div"); participation.className = "aar-participation";
    participation.append(metricBlock("ACTIVITY SOURCE", "UNIT SCHEDULE"), metricBlock("PARTICIPANTS", participantCount ? `${participantCount} PERSONNEL` : "UNIT EVENT"));
    body.appendChild(participation);
    const changes = document.createElement("div"); changes.className = "aar-change-grid";
    for (const key of ["readiness", "morale", "fatigue", "unitReadiness", "unitCohesion"]) {
      const before = record.before?.[key], after = record.after?.[key];
      if (before != null && after != null && before !== after) appendChangeRow(changes, { label: resultLabel(key), before, after, delta: after - before, key });
    }
    for (const [key, after] of Object.entries(record.after?.training ?? {})) {
      const before = record.before?.training?.[key];
      if (before != null && after !== before) appendChangeRow(changes, { label: `Unit ${key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}`, before, after, delta: after - before, key: "skill" });
    }
    if (changes.childElementCount) {
      const heading = document.createElement("h3"); heading.className = "aar-subheading"; heading.textContent = "Recorded Changes";
      body.append(heading, changes);
    }
    appendGameplayEvent(state, record.outcomeEventRecordId);
    dialog.showModal();
  }

  function showCommandResult(result) {
    if (!result) return;
    if (result.code === "activity_completed") return showActivity(result.data.activityRecordId);
    if (result.code === "decision_resolved") {
      dialog.dataset.tone = "routine";
      reference.textContent = compactReference("DEC", result.data.eventRecordId);
      kicker.textContent = "DECISION OUTCOME";
      title.textContent = result.data.title ?? "Decision Resolved";
      body.replaceChildren();
      const choice = document.createElement("div"); choice.className = "aar-performance";
      choice.append(statusStamp("completed"), metricBlock("ACTION", result.data.choiceLabel ?? result.message), metricBlock("TEAMMATE", result.data.targetPersonName ?? "—"));
      body.appendChild(choice);
      const changes = document.createElement("div"); changes.className = "aar-change-grid";
      for (const item of result.data.changes ?? []) appendChangeRow(changes, { label: item.label, before: item.before, after: item.after, delta: item.delta, key: item.label === "Morale" ? "morale" : "" });
      if (changes.childElementCount) {
        const heading = document.createElement("h3"); heading.className = "aar-subheading"; heading.textContent = "Recorded Changes";
        body.append(heading, changes);
      } else {
        const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Decision recorded. No measurable stat change was generated.";
        body.appendChild(empty);
      }
      dialog.showModal();
      return;
    }
    if (result.code === "time_advanced" || result.code === "time_interrupted") {
      dialog.dataset.tone = "routine";
      reference.textContent = compactReference("SITREP", `${result.data.startDate}-${result.data.endDate}`);
      kicker.textContent = "TIME ADVANCE SUMMARY";
      title.textContent = result.code === "time_interrupted" ? `${result.data.days} Day${result.data.days === 1 ? "" : "s"} Advanced · HOLD` : `${result.data.days} Day${result.data.days === 1 ? "" : "s"} Advanced`;
      body.replaceChildren();
      const grade = document.createElement("p"); grade.className = "result-grade"; grade.textContent = `${result.data.startDate} → ${result.data.endDate}`;
      body.appendChild(grade);
      const list = document.createElement("div"); list.className = "time-summary-list";
      for (const item of result.data.summaryItems ?? []) {
        const row = document.createElement("div"); row.className = `time-summary-item tone-${item.tone ?? "routine"}`; row.textContent = item.label;
        list.appendChild(row);
      }
      if (!list.childElementCount) {
        const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "No major career or unit events occurred.";
        list.appendChild(empty);
      }
      body.appendChild(list);
      dialog.showModal();
    }
  }

  return { showActivity, showDuty, showCommandResult };
}
