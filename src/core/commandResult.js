export function commandResult({ code, message = "", data = null, notifications = [] } = {}) {
  return Object.freeze({ ok: true, code: code ?? "ok", message, data, notifications });
}
