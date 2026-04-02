const COMPROMISED_PASSWORDS = new Set([
  '123456',
  'password',
  '123456789',
  'qwerty',
  '12345678',
  '111111',
  'abc123',
  'password123',
  'admin',
  'letmein'
]);

export function isPasswordCompromised(password = '') {
  return COMPROMISED_PASSWORDS.has(String(password).toLowerCase());
}

export function assessPasswordBreachRisk(password = '') {
  const normalized = String(password);
  const compromised = isPasswordCompromised(normalized);
  const isWeak = normalized.length < 10;

  if (compromised) {
    return {
      level: 'critical',
      compromised: true,
      reasons: ['Senha encontrada em base de credenciais comprometidas.']
    };
  }

  if (isWeak) {
    return {
      level: 'warning',
      compromised: false,
      reasons: ['Senha curta; recomenda-se pelo menos 10 caracteres.']
    };
  }

  return {
    level: 'ok',
    compromised: false,
    reasons: []
  };
}
