const AUDIT_STORAGE_KEY = 'password-manager.audit.v1';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createAuditEvent({ action, details = {}, actor = 'local-user', severity = 'info' }) {
  return {
    id: randomId(),
    action,
    actor,
    severity,
    details,
    createdAt: nowIso()
  };
}

export function createMemoryAuditRepository(initialEvents = []) {
  let events = [...initialEvents];

  return {
    async list() {
      return [...events].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    async append(event) {
      events = [event, ...events].slice(0, 200);
      return [...events];
    },
    async clear() {
      events = [];
    }
  };
}

export function createLocalStorageAuditRepository(storageKey = AUDIT_STORAGE_KEY) {
  return {
    async list() {
      if (typeof localStorage === 'undefined') {
        return [];
      }

      const payload = localStorage.getItem(storageKey);
      if (!payload) {
        return [];
      }

      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [];
    },
    async append(event) {
      if (typeof localStorage === 'undefined') {
        return [event];
      }

      const current = await this.list();
      const next = [event, ...current].slice(0, 200);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    },
    async clear() {
      if (typeof localStorage === 'undefined') {
        return;
      }

      localStorage.removeItem(storageKey);
    }
  };
}
