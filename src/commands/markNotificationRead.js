import { commandResult } from "../core/commandResult.js";
export function markNotificationRead(store, notificationId) {
  const record = store.getState().entities.notificationRecords[notificationId];
  if (!record) throw new Error(`Unknown notification: ${notificationId}`);
  if (record.readAtElapsedDay != null) return commandResult({ code: "already_read", data: { notificationId } });
  store.mutate(draft => { draft.entities.notificationRecords[notificationId].readAtElapsedDay = draft.world.clock.elapsedDays; }, ["notifications"]);
  return commandResult({ code: "notification_read", data: { notificationId } });
}
