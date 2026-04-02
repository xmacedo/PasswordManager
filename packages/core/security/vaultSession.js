const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;

function stableHash(text) {
  const source = String(text || '');
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function safeEquals(left, right) {
  const leftText = String(left || '');
  const rightText = String(right || '');

  if (leftText.length !== rightText.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < leftText.length; index += 1) {
    mismatch |= leftText.charCodeAt(index) ^ rightText.charCodeAt(index);
  }

  return mismatch === 0;
}

export function hashMasterPassword(masterPassword) {
  return stableHash(masterPassword);
}

export function verifyMasterPassword(masterPassword, masterPasswordHash) {
  return safeEquals(hashMasterPassword(masterPassword), masterPasswordHash);
}

export function createSessionState({
  locked = true,
  lastActivityAt = 0,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  masterPasswordHash = ''
} = {}) {
  return {
    locked,
    lastActivityAt,
    timeoutMs,
    masterPasswordHash
  };
}

export function shouldAutoLock(session, now = Date.now()) {
  if (!session || session.locked) {
    return false;
  }

  return now - session.lastActivityAt >= session.timeoutMs;
}

export function unlockSession(session, masterPassword, now = Date.now()) {
  const isValid = verifyMasterPassword(masterPassword, session.masterPasswordHash);
  if (!isValid) {
    return {
      ...session,
      locked: true
    };
  }

  return {
    ...session,
    locked: false,
    lastActivityAt: now
  };
}

export function touchSession(session, now = Date.now()) {
  if (!session || session.locked) {
    return session;
  }

  return {
    ...session,
    lastActivityAt: now
  };
}

export function lockSession(session) {
  return {
    ...session,
    locked: true
  };
}

export function configureSessionTimeout(session, timeoutMs) {
  const normalizedTimeout = Math.max(15000, Number(timeoutMs) || DEFAULT_TIMEOUT_MS);

  return {
    ...session,
    timeoutMs: normalizedTimeout
  };
}
