export function scheduleRecordBlocksFocusedActivities(record) {
  if (!record) return false;
  if (typeof record.blocksFocusedActivities === "boolean") return record.blocksFocusedActivities;
  return record.calendarVisibility !== "background";
}

export function dutyBlocksFocusedActivities(duty) {
  return duty?.blocksFocusedActivities !== false;
}

export function scheduleConflictForActivity(scheduleRecords, registries, startElapsedDay, endElapsedDay) {
  return scheduleRecords.find(record => {
    if (!record?.mandatory || !["scheduled", "in_progress"].includes(record.status)) return false;
    if (!scheduleRecordBlocksFocusedActivities(record)) return false;
    return startElapsedDay <= record.endElapsedDay && record.startElapsedDay <= endElapsedDay;
  }) ?? null;
}

export function describeScheduleConflict(record, registries) {
  if (!record) return "scheduled duty";
  const duty = registries.duties.get(record.dutyDefinitionId);
  const date = record.startDate === record.endDate || !record.endDate ? record.startDate : `${record.startDate} → ${record.endDate}`;
  return `${duty?.name ?? "scheduled duty"}${date ? ` (${date})` : ""}`;
}
