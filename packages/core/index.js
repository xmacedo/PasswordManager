export { generateStrongPassword } from './security/passwordGenerator.js';
export { encryptSecret, decryptSecret } from './security/cryptoVault.js';
export {
  createEmptyVault,
  normalizeVault,
  createLocalStorageVaultRepository,
  getChildFolders,
  getFolderPath,
  getEntriesByFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  createEntry,
  updateEntry,
  deleteEntry
} from './storage/vaultStore.js';
