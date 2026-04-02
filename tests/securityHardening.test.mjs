import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendAuditEvent,
  assessPasswordBreachRisk,
  createAuditLog,
  createSessionLock,
  isPasswordCompromised,
  isSessionLocked,
  lockSessionLock,
  unlockSessionLock
} from '../packages/core/index.js';

test('session lock bloqueia por timeout e permite reautenticação', () => {
  const base = createSessionLock({ timeoutMs: 20_000 });
  const unlocked = unlockSessionLock(base);

  assert.equal(isSessionLocked(unlocked, unlocked.lastActivityAt + 10_000), false);
  assert.equal(isSessionLocked(unlocked, unlocked.lastActivityAt + 20_001), true);

  const locked = lockSessionLock(unlocked);
  assert.equal(isSessionLocked(locked), true);
});

test('detecção de breach classifica senhas comprometidas', () => {
  assert.equal(isPasswordCompromised('password'), true);
  assert.equal(assessPasswordBreachRisk('password').level, 'critical');
  assert.equal(assessPasswordBreachRisk('forte#2026Password').level, 'ok');
});

test('audit log registra e mantém ordem reversa cronológica', () => {
  const empty = createAuditLog();
  const once = appendAuditEvent(empty, { type: 'entry.created' });
  const twice = appendAuditEvent(once, { type: 'entry.deleted' });

  assert.equal(twice.length, 2);
  assert.equal(twice[0].type, 'entry.deleted');
  assert.equal(twice[1].type, 'entry.created');
});
