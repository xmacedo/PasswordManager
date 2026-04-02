const COMMON_COMPROMISED_PASSWORDS = new Set([
  '123456',
  '123456789',
  'password',
  'qwerty',
  '111111',
  'abc123',
  'admin',
  'letmein',
  'welcome',
  'password123',
  'senha123',
  '123123'
]);

export function checkPasswordBreach(password) {
  const value = String(password || '').trim();

  if (!value) {
    return {
      breached: false,
      risk: 'none',
      reason: 'empty'
    };
  }

  if (COMMON_COMPROMISED_PASSWORDS.has(value.toLowerCase())) {
    return {
      breached: true,
      risk: 'high',
      reason: 'known-compromised-password'
    };
  }

  if (value.length < 8) {
    return {
      breached: true,
      risk: 'medium',
      reason: 'weak-short-password'
    };
  }

  return {
    breached: false,
    risk: 'low',
    reason: 'no-known-issues'
  };
}

export function evaluateVaultBreachStatus(entries = []) {
  return entries.map((entry) => ({
    entryId: entry.id,
    title: entry.title,
    ...checkPasswordBreach(entry.password)
  }));
}
