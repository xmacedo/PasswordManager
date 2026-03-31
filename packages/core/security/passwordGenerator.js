const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';

function randomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

export function generateStrongPassword(options = {}) {
  const {
    length = 20,
    useLowercase = true,
    useUppercase = true,
    useDigits = true,
    useSymbols = true
  } = options;

  if (length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
  }

  const groups = [];
  if (useLowercase) groups.push(LOWER);
  if (useUppercase) groups.push(UPPER);
  if (useDigits) groups.push(DIGITS);
  if (useSymbols) groups.push(SYMBOLS);

  if (groups.length === 0) {
    throw new Error('Ative ao menos um conjunto de caracteres.');
  }

  if (length < groups.length) {
    throw new Error('O tamanho da senha é menor que a quantidade de regras ativas.');
  }

  const allChars = groups.join('');
  const passwordChars = [];

  // Garante ao menos 1 caractere por grupo ativo
  for (const group of groups) {
    passwordChars.push(group[randomInt(group.length)]);
  }

  while (passwordChars.length < length) {
    passwordChars.push(allChars[randomInt(allChars.length)]);
  }

  // Fisher-Yates com CSPRNG
  for (let i = passwordChars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
