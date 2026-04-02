function nowMs() {
  return Date.now();
}

export function createSessionLock(options = {}) {
  const timeoutMs = Math.max(15_000, Number(options.timeoutMs || 5 * 60 * 1000));

  return {
    timeoutMs,
    lastActivityAt: nowMs(),
    lockedAt: null,
    isAuthenticated: false,
    failedAttempts: 0,
    unlockMethod: 'master-password'
  };
}

export function lockSessionLock(sessionLock) {
  return {
    ...sessionLock,
    lockedAt: nowMs(),
    isAuthenticated: false
  };
}

export function unlockSessionLock(sessionLock, method = 'master-password') {
  const timestamp = nowMs();

  return {
    ...sessionLock,
    isAuthenticated: true,
    lockedAt: null,
    lastActivityAt: timestamp,
    failedAttempts: 0,
    unlockMethod: method
  };
}

export function touchSessionLock(sessionLock) {
  if (!sessionLock.isAuthenticated) {
    return sessionLock;
  }

  return {
    ...sessionLock,
    lastActivityAt: nowMs()
  };
}

export function isSessionLocked(sessionLock, currentTimeMs = nowMs()) {
  if (!sessionLock.isAuthenticated) {
    return true;
  }

  return currentTimeMs - sessionLock.lastActivityAt >= sessionLock.timeoutMs;
}
