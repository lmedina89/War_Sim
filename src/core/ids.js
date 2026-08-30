let counter = 0;

export function createStableId(prefix = "ent") {
  counter += 1;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(3, "0");
  return `${prefix}_${time}_${seq}`;
}
