import { createEntityId } from "../core/ids.js";

export function recordAction(draft, { actorPersonId = null, commandType, payload = null, resultCode = "ok" }) {
  const id = createEntityId(draft, "action");
  draft.entities.actionRecords[id] = {
    id,
    schemaVersion: 1,
    actorPersonId,
    commandType,
    gameDate: draft.world.date,
    elapsedDays: draft.world.clock.elapsedDays,
    payload,
    resultCode
  };
  return id;
}

export function recordNotification(draft, { personId, type, title, message, priority = "normal", references = {} }) {
  const id = createEntityId(draft, "notice");
  draft.entities.notificationRecords[id] = {
    id,
    schemaVersion: 1,
    personId,
    type,
    title,
    message,
    priority,
    gameDate: draft.world.date,
    createdAtElapsedDay: draft.world.clock.elapsedDays,
    readAtElapsedDay: null,
    references
  };
  return id;
}
