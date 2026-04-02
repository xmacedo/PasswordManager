import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkPasswordBreach,
  configureSessionTimeout,
  createAuditEvent,
  createMemoryAuditRepository,
  createSessionState,
  hashMasterPassword,
  lockSession,
  shouldAutoLock,
  unlockSession
} from '../packages/core/index.js';

test('session lock/unlock and timeout flow', () => {
  const hash = hashMasterPassword('minha-mestra');
  const initial = createSessionState({
    locked: true,
    timeoutMs: 30000,
    masterPasswordHash: hash
  });

  const unlocked = unlockSession(initial, 'minha-mestra', 1000);
  assert.equal(unlocked.locked, false);
  assert.equal(shouldAutoLock(unlocked, 20000), false);
  assert.equal(shouldAutoLock(unlocked, 33001), true);

  const relocked = lockSession(unlocked);
  assert.equal(relocked.locked, true);

  const withTimeout = configureSessionTimeout(relocked, 1000);
  assert.equal(withTimeout.timeoutMs, 15000);
});

test('breach detection flags weak and compromised passwords', () => {
  assert.equal(checkPasswordBreach('123456').breached, true);
  assert.equal(checkPasswordBreach('abc').risk, 'medium');
  assert.equal(checkPasswordBreach('SenhaForte#2026').breached, false);
});

test('audit repository appends and lists events', async () => {
  const repo = createMemoryAuditRepository();
  const event = createAuditEvent({ action: 'vault.unlocked' });

  await repo.append(event);
  const list = await repo.list();

  assert.equal(list.length, 1);
  assert.equal(list[0].action, 'vault.unlocked');
});
