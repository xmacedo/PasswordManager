function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createAuditLog() {
  return [];
}

export function appendAuditEvent(auditLog, event) {
  const entry = {
    id: randomId('evt'),
    type: event.type,
    actor: event.actor || 'user',
    metadata: event.metadata || {},
    createdAt: nowIso()
  };

  return [entry, ...auditLog];
}

export function listRecentAuditEvents(auditLog, limit = 25) {
  return auditLog.slice(0, limit);
}

export function filterAuditEvents(auditLog, type) {
  return auditLog.filter((event) => event.type === type);
}
