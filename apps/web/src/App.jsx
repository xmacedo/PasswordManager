import { useEffect, useMemo, useRef, useState } from 'react';

import {
  appendAuditEvent,
  assessPasswordBreachRisk,
  createAuditLog,
  createEmptyVault,
  createEntry,
  createFolder,
  createSessionLock,
  decryptSecret,
  deleteEntry,
  deleteFolder,
  encryptSecret,
  generateStrongPassword,
  getChildFolders,
  getEntriesByFolder,
  getFolderPath,
  isSessionLocked,
  listRecentAuditEvents,
  lockSessionLock,
  renameFolder,
  touchSessionLock,
  unlockSessionLock,
  updateEntry
} from '@password-manager/core';

import { createCsvVaultRepository } from './csvVaultRepository';
import { importButtercupCsvToVault } from './buttercupCsvImport';

const repository = createCsvVaultRepository();
const MASTER_SECRET_KEY = 'pm-default-master-key';
const VAULT_LOCATION_STORAGE_KEY = 'pm-vault-location';
const TOUCH_ID_CREDENTIAL_STORAGE_KEY = 'pm-touch-id-credential';
const DEFAULT_ENCRYPTED_MASTER_SECRET =
  '{"algorithm":"AES-GCM","kdf":"PBKDF2-SHA256","iterations":310000,"salt":"Gmh7ZxwB9XhS/eXs/eD/kQ==","iv":"8yDwDLUZAPaXbaWe","cipherText":"/smjUP0gCeO8CmeWbV4MhRoVQILYJiSw"}';

function FolderTree({
  vault,
  parentId,
  selectedFolderId,
  expandedFolderIds,
  onSelect,
  onToggleFolder
}) {
  const children = getChildFolders(vault, parentId);

  if (children.length === 0) return null;

  return (
    <ul className="tree-list">
      {children.map((folder) => {
        const hasChildren = getChildFolders(vault, folder.id).length > 0;
        const isExpanded = expandedFolderIds.has(folder.id);
        const isActive = selectedFolderId === folder.id;

        return (
          <li key={folder.id}>
            <div className={`tree-row ${isActive ? 'active' : ''}`}>
              <button
                type="button"
                className="tree-toggle"
                onClick={() => onToggleFolder(folder.id)}
                disabled={!hasChildren}
                aria-label={isExpanded ? 'Recolher pasta' : 'Expandir pasta'}
              >
                {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
              </button>
              <button type="button" className={`tree-item ${isActive ? 'active' : ''}`} onClick={() => onSelect(folder.id)}>
                📁 {folder.name}
              </button>
            </div>
            {hasChildren && isExpanded && (
              <FolderTree
                vault={vault}
                parentId={folder.id}
                selectedFolderId={selectedFolderId}
                expandedFolderIds={expandedFolderIds}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function maskPassword(password, isVisible) {
  if (isVisible) return password || '—';
  return password ? '•'.repeat(Math.max(8, password.length)) : '—';
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return `${fallbackMessage}: ${error.message}`;
  }

  if (typeof error === 'string' && error.trim()) {
    return `${fallbackMessage}: ${error}`;
  }

  return fallbackMessage;
}

async function copyText(text) {
  if (!text) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlToArrayBuffer(value) {
  const normalized = String(value || '');
  const padded = normalized.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function getStoredTouchIdCredential() {
  try {
    const raw = window.localStorage.getItem(TOUCH_ID_CREDENTIAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredTouchIdCredential(credential) {
  window.localStorage.setItem(TOUCH_ID_CREDENTIAL_STORAGE_KEY, JSON.stringify(credential));
}

async function createTouchIdCredential() {
  if (!window.PublicKeyCredential || !navigator.credentials?.create) {
    return null;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'PasswordManager' },
      user: {
        id: userId,
        name: 'local-user@password-manager.app',
        displayName: 'Local User'
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60_000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      attestation: 'none'
    }
  });

  if (!credential?.rawId) return null;

  const storedCredential = {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    createdAt: new Date().toISOString()
  };
  setStoredTouchIdCredential(storedCredential);
  return storedCredential;
}

async function authenticateWithTouchId() {
  if (!window.PublicKeyCredential || !navigator.credentials?.get) {
    return false;
  }

  const storedCredential = getStoredTouchIdCredential();
  if (!storedCredential?.rawId) {
    const createdCredential = await createTouchIdCredential();
    return Boolean(createdCredential);
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60_000,
      userVerification: 'required',
      allowCredentials: [
        {
          id: base64UrlToArrayBuffer(storedCredential.rawId),
          type: 'public-key',
          transports: ['internal']
        }
      ]
    }
  });

  return Boolean(assertion);
}

export function App() {
  const [vault, setVault] = useState(createEmptyVault());
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState({});
  const [copyFeedback, setCopyFeedback] = useState('');
  const [auditLog, setAuditLog] = useState(createAuditLog());
  const [sessionLock, setSessionLock] = useState(() => createSessionLock({ timeoutMs: 90_000 }));
  const [masterPassword, setMasterPassword] = useState('');
  const [encryptedMasterSecret, setEncryptedMasterSecret] = useState(DEFAULT_ENCRYPTED_MASTER_SECRET);
  const [unlockInput, setUnlockInput] = useState('');
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [vaultLocation, setVaultLocation] = useState('');
  const [isLocationEditable, setIsLocationEditable] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => new Set(['root']));
  const [actionStatus, setActionStatus] = useState({ loading: false, message: '' });
  const [entryFormMode, setEntryFormMode] = useState(null);
  const [entryFormData, setEntryFormData] = useState({ id: '', title: '', username: '', password: '' });
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const vaultLocationRef = useRef('');
  const vaultRef = useRef(vault);
  const masterPasswordRef = useRef(masterPassword);
  const encryptedMasterSecretRef = useRef(encryptedMasterSecret);
  const buttercupImportInputRef = useRef(null);

  async function resolveVaultForLocation(location, fallbackMasterPassword = '') {
    const loaded = await repository.load({ location });
    const persistedMasterSecret = loaded.encryptedMasterSecret || DEFAULT_ENCRYPTED_MASTER_SECRET;
    let resolvedMasterPassword = String(fallbackMasterPassword || '');

    try {
      const storedMasterPassword = await decryptSecret(persistedMasterSecret, MASTER_SECRET_KEY);
      if (resolvedMasterPassword && storedMasterPassword !== resolvedMasterPassword) {
        throw new Error('Senha mestra inválida.');
      }
      resolvedMasterPassword = storedMasterPassword;
    } catch (error) {
      if (error instanceof Error && error.message === 'Senha mestra inválida.') {
        throw error;
      }
      if (!resolvedMasterPassword) throw new Error('Senha mestra não disponível para este cofre.');
    }

    const decryptedEntries = await Promise.all(
      loaded.vault.entries.map(async (entry) => {
        if (!entry.password) return entry;

        try {
          const password = await decryptSecret(entry.password, resolvedMasterPassword);
          return { ...entry, password };
        } catch {
          return { ...entry, password: '' };
        }
      })
    );

    return {
      resolvedMasterPassword,
      persistedMasterSecret,
      vault: {
        ...loaded.vault,
        entries: decryptedEntries
      }
    };
  }

  useEffect(() => {
    async function initialize() {
      try {
        const persistedVaultLocation = window.localStorage.getItem(VAULT_LOCATION_STORAGE_KEY) || '';
        const localVaultLocation = persistedVaultLocation.trim();

        setVaultLocation(localVaultLocation);
        vaultLocationRef.current = localVaultLocation;

        if (!localVaultLocation) {
          return;
        }

        const loaded = await repository.load({ location: localVaultLocation });
        setEncryptedMasterSecret(loaded.encryptedMasterSecret || DEFAULT_ENCRYPTED_MASTER_SECRET);
      } finally {
        setIsLoadingVault(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    vaultRef.current = vault;
  }, [vault]);

  useEffect(() => {
    masterPasswordRef.current = masterPassword;
  }, [masterPassword]);

  useEffect(() => {
    encryptedMasterSecretRef.current = encryptedMasterSecret;
  }, [encryptedMasterSecret]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionLock((current) => (isSessionLocked(current) ? lockSessionLock(current) : current));
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const selectedFolder = useMemo(
    () => vault.folders.find((folder) => folder.id === selectedFolderId) || vault.folders[0],
    [vault, selectedFolderId]
  );

  const entries = useMemo(() => getEntriesByFolder(vault, selectedFolder?.id || 'root'), [vault, selectedFolder]);
  const folderPath = useMemo(() => getFolderPath(vault, selectedFolder?.id || 'root'), [vault, selectedFolder]);

  const filteredEntries = useMemo(() => {
    const source = searchScope === 'current-folder' ? entries : vault.entries;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return source;

    return source.filter((entry) => {
      const searchable = [entry.title, entry.username, entry.password].join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [entries, searchScope, searchTerm, vault.entries]);

  useEffect(() => {
    const pathToSelected = getFolderPath(vault, selectedFolderId);
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      pathToSelected.forEach((folder) => next.add(folder.id));
      return next;
    });
  }, [vault, selectedFolderId]);

  async function persistVault(
    nextVault,
    masterSecret = encryptedMasterSecret,
    plainMasterPassword = masterPassword,
    location = vaultLocation
  ) {
    const encryptedEntries = await Promise.all(
      nextVault.entries.map(async (entry) => ({
        ...entry,
        password: entry.password ? await encryptSecret(entry.password, plainMasterPassword) : ''
      }))
    );

    await repository.save({
      vault: {
        ...nextVault,
        entries: encryptedEntries
      },
      encryptedMasterSecret: masterSecret
    }, { location });
  }

  async function commit(nextVault, eventType, metadata = {}, options = {}) {
    setVault(nextVault);
    setAuditLog((current) => appendAuditEvent(current, { type: eventType, metadata }));
    setSessionLock((current) => touchSessionLock(current));
    await persistVault(nextVault, options.masterSecret || encryptedMasterSecret, options.plainMasterPassword || masterPassword);
  }

  async function runWithLoading(message, action) {
    setActionStatus({ loading: true, message });
    try {
      await action();
    } finally {
      setActionStatus({ loading: false, message: '' });
    }
  }

  function toggleFolderExpanded(folderId) {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  async function persistCurrentVaultState() {
    const location = (vaultLocationRef.current || vaultLocation).trim();
    if (!location) return;
    if (!masterPasswordRef.current) return;
    await persistVault(vaultRef.current, encryptedMasterSecretRef.current, masterPasswordRef.current, location);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setCopyFeedback('Informe o nome da nova pasta.');
      return;
    }
    await runWithLoading('Criando pasta...', async () => {
      const nextVault = createFolder(vault, { parentId: selectedFolder.id, name });
      await commit(nextVault, 'folder.created', { parentId: selectedFolder.id, name });
    });
    setNewFolderName('');
    setIsCreateFolderModalOpen(false);
    setCopyFeedback(`Pasta "${name}" criada com sucesso.`);
  }

  async function handleRenameFolder() {
    if (selectedFolder.id === 'root') return;
    const name = window.prompt('Novo nome da pasta:', selectedFolder.name);
    if (!name) return;

    await runWithLoading('Renomeando pasta...', async () => {
      const nextVault = renameFolder(vault, { folderId: selectedFolder.id, name });
      await commit(nextVault, 'folder.renamed', { folderId: selectedFolder.id, name });
    });
  }

  async function handleDeleteFolder() {
    if (selectedFolder.id === 'root') return;
    const confirmed = window.confirm('Excluir esta pasta e todos os dados internos?');
    if (!confirmed) return;

    const deletedFolderId = selectedFolder.id;
    const parentId = selectedFolder.parentId || 'root';
    await runWithLoading('Excluindo pasta...', async () => {
      const nextVault = deleteFolder(vault, { folderId: deletedFolderId });
      setSelectedFolderId(parentId);
      await commit(nextVault, 'folder.deleted', { folderId: deletedFolderId });
    });
  }

  function openCreateEntryForm() {
    setEntryFormMode('create');
    setEntryFormData({
      id: '',
      title: '',
      username: '',
      password: generateStrongPassword({ length: 20, useDigits: true, useLowercase: true, useUppercase: true, useSymbols: true })
    });
  }

  function openEditEntryForm(entry) {
    setEntryFormMode('edit');
    setEntryFormData({
      id: entry.id,
      title: entry.title,
      username: entry.username || '',
      password: entry.password || ''
    });
  }

  function closeEntryForm() {
    setEntryFormMode(null);
    setEntryFormData({ id: '', title: '', username: '', password: '' });
  }

  function openCreateFolderModal() {
    setIsCreateFolderModalOpen(true);
    setNewFolderName('');
  }

  function closeCreateFolderModal() {
    setIsCreateFolderModalOpen(false);
    setNewFolderName('');
  }

  function resolveSelectedLocationPath(selectedName, currentLocation) {
    const normalizedName = String(selectedName || '').trim();
    if (!normalizedName) return '';

    if (/[\\/]/.test(normalizedName)) {
      return normalizedName;
    }

    const normalizedCurrent = String(currentLocation || '').trim();
    const separatorMatch = normalizedCurrent.match(/[\\/](?=[^\\/]*$)/);
    if (!separatorMatch) {
      return normalizedName;
    }

    const separatorIndex = separatorMatch.index ?? -1;
    if (separatorIndex < 0) return normalizedName;
    const directoryPath = normalizedCurrent.slice(0, separatorIndex + 1);
    return `${directoryPath}${normalizedName}`;
  }

  async function handleSubmitEntryForm(event) {
    event.preventDefault();

    const title = entryFormData.title.trim();
    if (!title) {
      setCopyFeedback('Informe o título da credencial.');
      return;
    }

    const username = entryFormData.username.trim();
    const password = entryFormData.password.trim() || generateStrongPassword({ length: 20 });

    if (entryFormMode === 'create') {
      await runWithLoading('Salvando nova credencial...', async () => {
        const nextVault = createEntry(vault, { folderId: selectedFolder.id, title, username, password });
        await commit(nextVault, 'entry.created', { folderId: selectedFolder.id, title });
      });
      setCopyFeedback(`Credencial "${title}" criada com sucesso.`);
      closeEntryForm();
      return;
    }

    if (entryFormMode === 'edit' && entryFormData.id) {
      await runWithLoading('Atualizando credencial...', async () => {
        const nextVault = updateEntry(vault, { entryId: entryFormData.id, title, username, password });
        await commit(nextVault, 'entry.updated', { entryId: entryFormData.id, title });
      });
      setCopyFeedback(`Credencial "${title}" atualizada com sucesso.`);
      closeEntryForm();
    }
  }

  async function handleDeleteEntry(entryId) {
    const confirmed = window.confirm('Remover credencial?');
    if (!confirmed) return;

    await runWithLoading('Excluindo credencial...', async () => {
      const nextVault = deleteEntry(vault, { entryId });
      await commit(nextVault, 'entry.deleted', { entryId });
    });
  }

  async function handleUpdateMasterPassword() {
    const nextPassword = window.prompt('Nova senha mestra:', masterPassword);
    if (!nextPassword) return;

    await runWithLoading('Atualizando senha mestra...', async () => {
      const nextMasterSecret = await encryptSecret(nextPassword, MASTER_SECRET_KEY);
      setMasterPassword(nextPassword);
      setEncryptedMasterSecret(nextMasterSecret);
      await commit(vault, 'security.master_password_updated', {}, {
        masterSecret: nextMasterSecret,
        plainMasterPassword: nextPassword
      });
    });
  }

  function handleVaultLocationChange(nextLocation) {
    setVaultLocation(nextLocation);
    vaultLocationRef.current = nextLocation;
  }

  function handleSaveVaultLocation() {
    if (!vaultLocation.trim()) {
      window.localStorage.removeItem(VAULT_LOCATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, vaultLocation.trim());
  }

  async function handleSelectExistingVault() {
    await runWithLoading('Selecionando arquivo de cofre...', async () => {
      try {
        const selectedName = await repository.connectToExistingVault();
        if (!selectedName) return;
        const resolvedLocation = resolveSelectedLocationPath(selectedName, vaultLocationRef.current || vaultLocation);
        handleVaultLocationChange(resolvedLocation);
        window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, resolvedLocation);
        const loadedState = await resolveVaultForLocation(resolvedLocation, masterPassword);
        setVault(loadedState.vault);
        setEncryptedMasterSecret(loadedState.persistedMasterSecret);
        setMasterPassword(loadedState.resolvedMasterPassword);
        setCopyFeedback(`Arquivo "${resolvedLocation}" carregado com sucesso.`);
      } catch {
        setCopyFeedback('Não foi possível selecionar um arquivo existente.');
      }
    });
  }

  async function handleCreateVaultFromLockScreen() {
    await runWithLoading('Criando novo arquivo de cofre...', async () => {
      try {
        const selectedName = await repository.createVaultFile();
        if (!selectedName) return;
        const resolvedLocation = resolveSelectedLocationPath(selectedName, vaultLocationRef.current || vaultLocation);
        const emptyVault = createEmptyVault();
        handleVaultLocationChange(resolvedLocation);
        window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, resolvedLocation);
        await persistVault(emptyVault, encryptedMasterSecret, masterPassword, resolvedLocation);
        setVault(emptyVault);
        setExpandedFolderIds(new Set(['root']));
        setCopyFeedback(`Arquivo "${resolvedLocation}" criado com sucesso.`);
      } catch {
        setCopyFeedback('Não foi possível criar um novo arquivo de cofre.');
      }
    });
  }

  function handleOpenButtercupImport() {
    buttercupImportInputRef.current?.click();
  }

  async function handleImportButtercupCsv(event) {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      'Importar do Buttercup vai substituir o cofre atual em memória. Deseja continuar?'
    );
    if (!confirmed) return;

    await runWithLoading('Importando CSV do Buttercup...', async () => {
      try {
        const csvText = await file.text();
        const imported = importButtercupCsvToVault(csvText);
        setSelectedFolderId('root');
        setExpandedFolderIds(new Set(['root']));
        await commit(imported.vault, 'vault.imported.buttercup', {
          fileName: file.name,
          importedEntries: imported.summary.entries,
          importedGroups: imported.summary.groups
        });
        setCopyFeedback(
          `Importação concluída: ${imported.summary.entries} credenciais e ${imported.summary.groups} grupos do Buttercup.`
        );
      } catch (error) {
        setCopyFeedback(error instanceof Error ? error.message : 'Falha ao importar CSV do Buttercup.');
      }
    });
  }

  function getFolderName(folderId) {
    return vault.folders.find((folder) => folder.id === folderId)?.name || 'Sem pasta';
  }

  function handleToggleReveal(entryId) {
    setVisiblePasswordIds((current) => ({ ...current, [entryId]: !current[entryId] }));
    setAuditLog((current) => appendAuditEvent(current, { type: 'entry.reveal_toggled', metadata: { entryId } }));
    setSessionLock((current) => touchSessionLock(current));
  }

  async function handleCopyPassword(entry) {
    const didCopy = await copyText(entry.password);
    setCopyFeedback(didCopy ? `Senha de "${entry.title}" copiada.` : 'Não foi possível copiar a senha.');
    setAuditLog((current) => appendAuditEvent(current, { type: 'entry.copied', metadata: { entryId: entry.id, didCopy } }));
    setSessionLock((current) => touchSessionLock(current));

    window.setTimeout(() => setCopyFeedback(''), 2500);
  }

  function handleGeneratePassword() {
    setGeneratedPassword(generateStrongPassword({ length: 20, useDigits: true, useLowercase: true, useUppercase: true, useSymbols: true }));
    setAuditLog((current) => appendAuditEvent(current, { type: 'security.password_generated' }));
  }

  async function handleManualLock() {
    await runWithLoading('Bloqueando sessão...', async () => {
      try {
        await persistCurrentVaultState();
      } catch (error) {
        const feedback = getErrorMessage(error, 'Falha ao salvar o estado atual antes de bloquear');
        console.error('Erro ao salvar estado do cofre antes do bloqueio manual.', error);
        setCopyFeedback(feedback);
        setAuditLog((current) =>
          appendAuditEvent(current, {
            type: 'vault.persist_failed_before_lock',
            metadata: { message: feedback }
          })
        );
      }
      setSessionLock((current) => lockSessionLock(current));
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.session_locked' }));
    });
  }

  useEffect(() => {
    if (!isSessionLocked(sessionLock)) return;
    void persistCurrentVaultState().catch((error) => {
      const feedback = getErrorMessage(error, 'Falha ao salvar o estado atual ao bloquear a sessão');
      console.error('Erro ao salvar estado do cofre durante bloqueio de sessão.', error);
      setCopyFeedback(feedback);
      setAuditLog((current) =>
        appendAuditEvent(current, {
          type: 'vault.persist_failed_on_lock',
          metadata: { message: feedback }
        })
      );
    });
  }, [sessionLock]);

  async function handleUnlock() {
    const normalizedLocation = (vaultLocationRef.current || vaultLocation).trim();
    if (!normalizedLocation) {
      setCopyFeedback('Selecione ou crie um arquivo de cofre antes de desbloquear.');
      return;
    }

    if (!unlockInput) {
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed' }));
      setCopyFeedback('Informe a senha mestra para desbloquear.');
      return;
    }

    await runWithLoading('Desbloqueando cofre...', async () => {
      try {
        const loadedState = await resolveVaultForLocation(normalizedLocation, unlockInput);
        setVault(loadedState.vault);
        setEncryptedMasterSecret(loadedState.persistedMasterSecret);
        setMasterPassword(loadedState.resolvedMasterPassword);
        window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, normalizedLocation);
        setSessionLock((current) => unlockSessionLock(current, 'master-password'));
        setUnlockInput('');
        setCopyFeedback('');
        setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_success' }));
      } catch {
        setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed' }));
        setCopyFeedback('Senha mestra inválida ou arquivo de cofre incompatível.');
      }
    });
  }

  async function handleUnlockWithTouchId() {
    await runWithLoading('Validando Touch ID...', async () => {
      try {
        const normalizedLocation = (vaultLocationRef.current || vaultLocation).trim();
        if (!normalizedLocation) {
          setCopyFeedback('Selecione ou crie um arquivo de cofre antes de usar Touch ID.');
          return;
        }

        const hadStoredTouchIdCredential = Boolean(getStoredTouchIdCredential()?.rawId);
        if (!hadStoredTouchIdCredential && !masterPassword) {
          setCopyFeedback('Desbloqueie com a senha mestra uma vez antes de habilitar o Touch ID.');
          return;
        }

        const unlocked = await authenticateWithTouchId();
        if (!unlocked) {
          setCopyFeedback('Touch ID não disponível neste navegador/dispositivo.');
          return;
        }

        const loadedState = await resolveVaultForLocation(normalizedLocation, masterPassword);
        setVault(loadedState.vault);
        setEncryptedMasterSecret(loadedState.persistedMasterSecret);
        setMasterPassword(loadedState.resolvedMasterPassword);
        window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, normalizedLocation);
        setSessionLock((current) => unlockSessionLock(current, 'touch-id'));
        setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_success', metadata: { method: 'touch-id' } }));
        setUnlockInput('');
        setCopyFeedback(hadStoredTouchIdCredential ? 'Touch ID validado com sucesso.' : 'Touch ID configurado e validado com sucesso.');
      } catch {
        setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed', metadata: { method: 'touch-id' } }));
        setCopyFeedback('Falha ao autenticar com Touch ID.');
      }
    });
  }

  const showOnboarding = vault.entries.length === 0;
  const isSearching = searchTerm.trim().length > 0;
  const recentEvents = listRecentAuditEvents(auditLog, 8);

  if (isLoadingVault) {
    return (
      <main className="container">
        <section className="card lock-screen">
          <h1>PasswordManager</h1>
          <p>Verificando arquivo de cofre selecionado...</p>
        </section>
      </main>
    );
  }

  if (isSessionLocked(sessionLock)) {
    return (
      <main className="container">
        <section className="card lock-screen">
          <h1>Password Manager</h1>
          <label>
            Vault Path:
            <input
              type="text"
              value={vaultLocation}
              disabled={!isLocationEditable}
              onChange={(event) => handleVaultLocationChange(event.target.value)}
              placeholder="Ex: password-manager.vault.csv"
            />
          </label>
          {vaultLocation ? (
            <p className="helper">Arquivo selecionado: {vaultLocation}</p>
          ) : (
            <p className="helper">Nenhum arquivo selecionado. Selecione um CSV existente ou crie um novo cofre.</p>
          )}
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={isLocationEditable}
              onChange={(event) => {
                setIsLocationEditable(event.target.checked);
                if (!event.target.checked) {
                  handleSaveVaultLocation();
                }
              }}
            />
            Enable to change the file
          </label>
          <div className="actions-row">
            <button type="button" onClick={handleSaveVaultLocation} disabled={!isLocationEditable}>
              Save
            </button>
            <button type="button" onClick={handleSelectExistingVault} disabled={actionStatus.loading}>
              Select file
            </button>
            <button type="button" onClick={handleCreateVaultFromLockScreen} disabled={actionStatus.loading}>
              +
            </button>
          </div>
          <label>
            Password
            <input type="password" value={unlockInput} onChange={(event) => setUnlockInput(event.target.value)} />
          </label>
      
          
          <button type="button" onClick={handleUnlock} disabled={actionStatus.loading}>
            Desbloquear
          </button>&nbsp;
          <button type="button" onClick={handleUnlockWithTouchId} disabled={actionStatus.loading}>
            Touch ID (Mac)
          </button>
          {actionStatus.loading && (
            <p className="processing-message" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" /> {actionStatus.message || 'Processando...'}
            </p>
          )}
          {copyFeedback && <p className="helper">{copyFeedback}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>PasswordManager</h1>
      <p>v0.4.0: hardening com timeout de sessão, alertas de vazamento e logs de auditoria.</p>

      <section className="layout">
        <input
          ref={buttercupImportInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportButtercupCsv}
          style={{ display: 'none' }}
        />
        <aside className="card sidebar">
          <h2>Explorer</h2>
          <button type="button" onClick={() => setSelectedFolderId('root')} className="tree-root">
            🗂️ Vault
          </button>
          <FolderTree
            vault={vault}
            parentId="root"
            selectedFolderId={selectedFolder.id}
            expandedFolderIds={expandedFolderIds}
            onSelect={setSelectedFolderId}
            onToggleFolder={toggleFolderExpanded}
          />
          <button type="button" className="lock-btn" onClick={handleManualLock}>
            🔒 Bloquear agora
          </button>
        </aside>

        <section className="card content">
          <h2>{selectedFolder.name}</h2>
          <div className="breadcrumb">
            {folderPath.map((folder, index) => (
              <span key={folder.id}>
                {index > 0 && ' / '}
                <button type="button" onClick={() => setSelectedFolderId(folder.id)}>
                  {folder.name}
                </button>
              </span>
            ))}
          </div>

          {actionStatus.loading && (
            <p className="processing-message" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" /> {actionStatus.message || 'Processando...'}
            </p>
          )}

          <div className="actions-row">
            <button type="button" onClick={openCreateFolderModal} disabled={actionStatus.loading}>+ Nova pasta</button>
            <button type="button" onClick={handleRenameFolder} disabled={selectedFolder.id === 'root' || actionStatus.loading}>Renomear pasta</button>
            <button type="button" onClick={handleDeleteFolder} disabled={selectedFolder.id === 'root' || actionStatus.loading}>Excluir pasta</button>
            <button type="button" onClick={openCreateEntryForm} disabled={actionStatus.loading}>+ Nova credencial</button>
            <button type="button" onClick={handleOpenButtercupImport} disabled={actionStatus.loading}>Importar CSV Buttercup</button>
          </div>

          <div className="search-bar">
            <input
              type="search"
              placeholder="Buscar por título, usuário ou senha"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select value={searchScope} onChange={(event) => setSearchScope(event.target.value)}>
              <option value="all">Todas as pastas</option>
              <option value="current-folder">Apenas pasta atual</option>
            </select>
          </div>

          {copyFeedback && <p className="feedback">{copyFeedback}</p>}

          {showOnboarding && (
            <div className="empty-state onboarding">
              <h3>Bem-vindo ao seu cofre</h3>
              <p>Comece criando pastas para organizar categorias como Trabalho, Pessoal e Financeiro.</p>
            </div>
          )}

          <ul className="entries-list">
            {filteredEntries.length === 0 && (
              <li className="empty-state">
                {isSearching
                  ? 'Nenhuma credencial encontrada com este filtro de busca.'
                  : 'Nenhuma credencial nesta pasta. Clique em “+ Nova credencial” para começar.'}
              </li>
            )}
            {filteredEntries.map((entry) => {
              const breach = assessPasswordBreachRisk(entry.password);

              return (
                <li key={entry.id} className="entry-item">
                  <div>
                    <strong>{entry.title}</strong>
                    <p>Usuário: {entry.username || '—'}</p>
                    <p>
                      Senha: {maskPassword(entry.password, !!visiblePasswordIds[entry.id])}
                      <button type="button" className="text-button" onClick={() => handleToggleReveal(entry.id)}>
                        {visiblePasswordIds[entry.id] ? 'Ocultar' : 'Revelar'}
                      </button>
                    </p>
                    {searchScope === 'all' && <p>Pasta: {getFolderName(entry.folderId)}</p>}
                    {breach.level !== 'ok' && <p className={`risk risk-${breach.level}`}>⚠️ {breach.reasons[0]}</p>}
                  </div>
                  <div className="entry-actions">
                    <button type="button" onClick={() => handleCopyPassword(entry)} disabled={actionStatus.loading}>Copiar senha</button>
                    <button type="button" onClick={() => openEditEntryForm(entry)} disabled={actionStatus.loading}>Editar</button>
                    <button type="button" onClick={() => handleDeleteEntry(entry.id)} disabled={actionStatus.loading}>Excluir</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </section>

      <section className="card">
        <details>
          <summary>Master Password</summary>
        <label>
          <input type="password" value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} />
        </label>
        <button type="button" onClick={handleUpdateMasterPassword} disabled={actionStatus.loading}>Save new master password</button>
        </details>
      </section>

      <section className="card">
        <details>
          <summary>Audit trail</summary>
          <ul className="audit-list">
            {recentEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.type}</strong> <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
              </li>
            ))}
            {recentEvents.length === 0 && <li>Nenhum evento ainda.</li>}
          </ul>
        </details>
      </section>

      {isCreateFolderModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateFolderModal}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-create-folder-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="modal-create-folder-title">New Folder</h3>
            <label>
              <input
                type="text"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Ex: Trabalho"
                autoFocus
              />
            </label>
            <div className="actions-row modal-actions">
              <button type="button" onClick={handleCreateFolder} disabled={actionStatus.loading}>
                Save
              </button>
              <button type="button" className="secondary-btn" onClick={closeCreateFolderModal} disabled={actionStatus.loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {entryFormMode && (
        <div className="modal-backdrop" role="presentation" onClick={closeEntryForm}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-entry-title" onClick={(event) => event.stopPropagation()}>
            <form className="entry-form" onSubmit={handleSubmitEntryForm}>
              <h3 id="modal-entry-title">{entryFormMode === 'create' ? 'New Entry' : 'Edit Entry'}</h3>
              <div className="entry-form-grid">
                <label>
                  Name &nbsp;
                  <input
                    type="text"
                    value={entryFormData.title}
                    onChange={(event) => setEntryFormData((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex: GitHub"
                    required
                    autoFocus
                  />
                </label>
                <label>
                  User/Login &nbsp;
                  <input
                    type="text"
                    value={entryFormData.username}
                    onChange={(event) => setEntryFormData((current) => ({ ...current, username: event.target.value }))}
                    placeholder="email@empresa.com"
                  />
                </label>
                <label>
                  Password &nbsp;
                  <input
                    type="text"
                    value={entryFormData.password}
                    onChange={(event) => setEntryFormData((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Informe uma senha"
                  />&nbsp;
                  <button type="button" onClick={handleGeneratePassword} disabled={actionStatus.loading}>Generate</button>
                  {generatedPassword && <code>{generatedPassword}</code>}
                </label>
              </div>
              <div className="actions-row modal-actions">
                <button type="submit" disabled={actionStatus.loading}>Save</button>
                <button type="button" className="secondary-btn" onClick={closeEntryForm} disabled={actionStatus.loading}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
