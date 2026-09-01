export function awardDeviceLabel(item) {
  if (item.count <= 1) return "";
  const device = item.definition.repeatDevice;
  if (!device) return `×${item.count}`;
  if (device.type === "oak_leaf_cluster") return `${item.count - 1} OLC`;
  if (device.type === "service_star") return `${item.count - 1} service star${item.count - 1 === 1 ? "" : "s"}`;
  if (device.type === "numeral") return `Numeral ${item.count}`;
  if (device.type === "knot") return `${item.count} awards`;
  return `×${item.count}`;
}
