export function addMonthsIso(isoDate, months) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

export function daysBetweenIso(fromIso, toIso) {
  const a = Date.parse(`${fromIso}T00:00:00Z`), b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.floor((b - a) / 86400000);
}

export function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
