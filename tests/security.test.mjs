import test from 'node:test';
import assert from 'node:assert/strict';

import { generateStrongPassword } from '../packages/core/security/passwordGenerator.js';
import { decryptSecret, encryptSecret } from '../packages/core/security/cryptoVault.js';

test('generateStrongPassword cria senha com tamanho esperado e complexidade mínima', () => {
  const password = generateStrongPassword({
    length: 24,
    useLowercase: true,
    useUppercase: true,
    useDigits: true,
    useSymbols: true
  });

  assert.equal(password.length, 24);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^a-zA-Z0-9]/);
});

test('encryptSecret/decryptSecret mantém integridade dos dados', async () => {
  const secret = 'MinhaSenhaSuperSecreta!';
  const masterPassword = 'UmaSenhaMestraMuitoForte#2026';

  const encryptedPayload = await encryptSecret(secret, masterPassword);
  const decrypted = await decryptSecret(encryptedPayload, masterPassword);

  assert.equal(decrypted, secret);
});
