const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 310000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64Text) {
  return Uint8Array.from(Buffer.from(base64Text, 'base64'));
}

async function deriveAesKey(masterPassword, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH_BITS
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecret(plainText, masterPassword) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveAesKey(masterPassword, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encoder.encode(plainText)
  );

  return JSON.stringify({
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    cipherText: toBase64(new Uint8Array(cipherBuffer))
  });
}

export async function decryptSecret(payloadJson, masterPassword) {
  const payload = JSON.parse(payloadJson);
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const cipherText = fromBase64(payload.cipherText);
  const key = await deriveAesKey(masterPassword, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    cipherText
  );

  return decoder.decode(plainBuffer);
}
