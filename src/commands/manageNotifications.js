import { commandResult } from "../core/commandResult.js";

export function archiveNotification(store, notificationId) {
  const record = store.getState().entities.notificationRecords[notificationId];
  if (!record) throw new Error(`Unknown notification: ${notificationId}`);
  store.mutate(draft => {
    const notice = draft.entities.notificationRecords[notificationId];
    notice.readAtElapsedDay ??= draft.world.clock.elapsedDays;
    notice.archivedAtElapsedDay = draft.world.clock.elapsedDays;
  }, ["notifications"]);
  return commandResult({ code: "notification_archived", message: "Notification cleared.", data: { notificationId } });
}

export function markAllNotificationsRead(store, personId) {
  const ids = [...(store.getIndexes().notificationsByPersonId?.get(personId) ?? [])];
  let count = 0;
  store.mutate(draft => {
    for (const id of ids) {
      const notice = draft.entities.notificationRecords[id];
      if (notice?.archivedAtElapsedDay == null && notice.readAtElapsedDay == null) { notice.readAtElapsedDay = draft.world.clock.elapsedDays; count++; }
    }
  }, ["notifications"]);
  return commandResult({ code: "notifications_read", message: count ? `Marked ${count} notification${count === 1 ? "" : "s"} read.` : "No unread notifications.", data: { count } });
}

export function clearReadNotifications(store, personId) {
  const ids = [...(store.getIndexes().notificationsByPersonId?.get(personId) ?? [])];
  let count = 0;
  store.mutate(draft => {
    for (const id of ids) {
      const notice = draft.entities.notificationRecords[id];
      if (notice?.readAtElapsedDay != null && notice.archivedAtElapsedDay == null) { notice.archivedAtElapsedDay = draft.world.clock.elapsedDays; count++; }
    }
  }, ["notifications"]);
  return commandResult({ code: "notifications_archived", message: count ? `Cleared ${count} read notification${count === 1 ? "" : "s"}.` : "No read notifications to clear.", data: { count } });
}
