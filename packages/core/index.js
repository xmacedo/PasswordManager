export { generateStrongPassword } from './security/passwordGenerator.js';
export { encryptSecret, decryptSecret } from './security/cryptoVault.js';
export {
  createSessionLock,
  touchSessionLock,
  unlockSessionLock,
  lockSessionLock,
  isSessionLocked
} from './security/sessionLock.js';
export { assessPasswordBreachRisk, isPasswordCompromised } from './security/breachDetection.js';
export {
  createAuditLog,
  appendAuditEvent,
  listRecentAuditEvents,
  filterAuditEvents
} from './storage/auditLogStore.js';
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
