export { generateStrongPassword } from './security/passwordGenerator.js';
export { encryptSecret, decryptSecret } from './security/cryptoVault.js';
export {
  checkPasswordBreach,
  evaluateVaultBreachStatus
} from './security/breachDetection.js';
export {
  createSessionState,
  hashMasterPassword,
  verifyMasterPassword,
  shouldAutoLock,
  unlockSession,
  touchSession,
  lockSession,
  configureSessionTimeout
} from './security/vaultSession.js';
export {
  createAuditEvent,
  createMemoryAuditRepository,
  createLocalStorageAuditRepository
} from './security/auditLog.js';
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
