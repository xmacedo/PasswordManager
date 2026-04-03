import { useEffect, useMemo, useState } from 'react';

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

const repository = createCsvVaultRepository();
const MASTER_SECRET_KEY = 'pm-default-master-key';
const MASTER_PASSWORD_STORAGE_KEY = 'pm-master-password';
const VAULT_LOCATION_STORAGE_KEY = 'pm-vault-location';
const DEFAULT_ENCRYPTED_MASTER_SECRET =
  '{"algorithm":"AES-GCM","kdf":"PBKDF2-SHA256","iterations":310000,"salt":"Gmh7ZxwB9XhS/eXs/eD/kQ==","iv":"8yDwDLUZAPaXbaWe","cipherText":"/smjUP0gCeO8CmeWbV4MhRoVQILYJiSw"}';

function FolderTree({ vault, parentId, selectedFolderId, onSelect }) {
  const children = getChildFolders(vault, parentId);

  if (children.length === 0) return null;

  return (
    <ul className="tree-list">
      {children.map((folder) => (
        <li key={folder.id}>
          <button
            type="button"
            className={`tree-item ${selectedFolderId === folder.id ? 'active' : ''}`}
            onClick={() => onSelect(folder.id)}
          >
            📁 {folder.name}
          </button>
          <FolderTree vault={vault} parentId={folder.id} selectedFolderId={selectedFolderId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}

function maskPassword(password, isVisible) {
  if (isVisible) return password || '—';
  return password ? '•'.repeat(Math.max(8, password.length)) : '—';
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

async function unlockWithTouchId() {
  if (!window.PublicKeyCredential || !navigator.credentials?.create) {
    return false;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  await navigator.credentials.create({
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

  return true;
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

  async function resolveVaultForLocation(location, fallbackMasterPassword) {
    const loaded = await repository.load({ location });
    const persistedMasterSecret = loaded.encryptedMasterSecret || DEFAULT_ENCRYPTED_MASTER_SECRET;
    let resolvedMasterPassword = fallbackMasterPassword;

    if (!resolvedMasterPassword) {
      resolvedMasterPassword = await decryptSecret(DEFAULT_ENCRYPTED_MASTER_SECRET, MASTER_SECRET_KEY);
    }

    try {
      resolvedMasterPassword = await decryptSecret(persistedMasterSecret, MASTER_SECRET_KEY);
    } catch {
      // keep existing fallback
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
        const localMasterPassword = window.localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY) || '';
        const localVaultLocation = window.localStorage.getItem(VAULT_LOCATION_STORAGE_KEY) || 'vault/principal';
        const defaultMasterPassword = await decryptSecret(DEFAULT_ENCRYPTED_MASTER_SECRET, MASTER_SECRET_KEY);
        const initialMasterPassword = localMasterPassword || defaultMasterPassword;

        setVaultLocation(localVaultLocation);
        setMasterPassword(initialMasterPassword);

        const loadedState = await resolveVaultForLocation(localVaultLocation, initialMasterPassword);
        setEncryptedMasterSecret(loadedState.persistedMasterSecret);
        setVault(loadedState.vault);
      } finally {
        setIsLoadingVault(false);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!masterPassword) {
      window.localStorage.removeItem(MASTER_PASSWORD_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, masterPassword);
  }, [masterPassword]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionLock((current) => (isSessionLocked(current) ? lockSessionLock(current) : current));
    }, 1500);

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

  async function handleCreateFolder() {
    const name = window.prompt('Nome da nova pasta:');
    if (!name) return;
    const nextVault = createFolder(vault, { parentId: selectedFolder.id, name });
    await commit(nextVault, 'folder.created', { parentId: selectedFolder.id, name });
  }

  async function handleRenameFolder() {
    if (selectedFolder.id === 'root') return;
    const name = window.prompt('Novo nome da pasta:', selectedFolder.name);
    if (!name) return;

    const nextVault = renameFolder(vault, { folderId: selectedFolder.id, name });
    await commit(nextVault, 'folder.renamed', { folderId: selectedFolder.id, name });
  }

  async function handleDeleteFolder() {
    if (selectedFolder.id === 'root') return;
    const confirmed = window.confirm('Excluir esta pasta e todos os dados internos?');
    if (!confirmed) return;

    const deletedFolderId = selectedFolder.id;
    const parentId = selectedFolder.parentId || 'root';
    const nextVault = deleteFolder(vault, { folderId: deletedFolderId });
    setSelectedFolderId(parentId);
    await commit(nextVault, 'folder.deleted', { folderId: deletedFolderId });
  }

  async function handleCreateEntry() {
    const title = window.prompt('Título da credencial (ex: GitHub):');
    if (!title) return;

    const username = window.prompt('Usuário/Login:') || '';
    const password =
      window.prompt('Senha (deixe vazio para gerar uma forte):') || generateStrongPassword({ length: 20 });

    const nextVault = createEntry(vault, { folderId: selectedFolder.id, title, username, password });
    await commit(nextVault, 'entry.created', { folderId: selectedFolder.id, title });
  }

  async function handleEditEntry(entry) {
    const title = window.prompt('Editar título:', entry.title);
    if (!title) return;

    const username = window.prompt('Editar usuário/login:', entry.username) || '';
    const password = window.prompt('Editar senha:', entry.password) || '';
    const nextVault = updateEntry(vault, { entryId: entry.id, title, username, password });
    await commit(nextVault, 'entry.updated', { entryId: entry.id, title });
  }

  async function handleDeleteEntry(entryId) {
    const confirmed = window.confirm('Remover credencial?');
    if (!confirmed) return;

    const nextVault = deleteEntry(vault, { entryId });
    await commit(nextVault, 'entry.deleted', { entryId });
  }

  async function handleUpdateMasterPassword() {
    const nextPassword = window.prompt('Nova senha mestra:', masterPassword);
    if (!nextPassword) return;

    const nextMasterSecret = await encryptSecret(nextPassword, MASTER_SECRET_KEY);
    setMasterPassword(nextPassword);
    setEncryptedMasterSecret(nextMasterSecret);
    window.localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, nextPassword);
    await commit(vault, 'security.master_password_updated', {}, {
      masterSecret: nextMasterSecret,
      plainMasterPassword: nextPassword
    });
  }

  function handleVaultLocationChange(nextLocation) {
    setVaultLocation(nextLocation);
  }

  function handleSaveVaultLocation() {
    if (!vaultLocation.trim()) {
      window.localStorage.removeItem(VAULT_LOCATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, vaultLocation.trim());
  }

  async function handleSelectExistingVault() {
    try {
      const selectedName = await repository.connectToExistingVault();
      if (!selectedName) return;
      handleVaultLocationChange(selectedName);
      window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, selectedName);
      const loadedState = await resolveVaultForLocation(selectedName, masterPassword);
      setVault(loadedState.vault);
      setEncryptedMasterSecret(loadedState.persistedMasterSecret);
      setMasterPassword(loadedState.resolvedMasterPassword);
      setCopyFeedback(`Arquivo "${selectedName}" selecionado com sucesso.`);
    
    } catch {
      setCopyFeedback('Não foi possível selecionar um arquivo existente.');
    }
  }

  async function handleCreateVaultFromLockScreen() {
    try {
      const selectedName = await repository.createVaultFile();
      if (!selectedName) return;
      handleVaultLocationChange(selectedName);
      window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, selectedName);
      await persistVault(createEmptyVault(), encryptedMasterSecret, masterPassword, selectedName);
      setVault(createEmptyVault());
      setCopyFeedback(`Arquivo "${selectedName}" criado com sucesso.`);
    } catch {
      setCopyFeedback('Não foi possível criar um novo arquivo de cofre.');
    }
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

  function handleManualLock() {
    setSessionLock((current) => lockSessionLock(current));
    setAuditLog((current) => appendAuditEvent(current, { type: 'security.session_locked' }));
  }

  async function handleUnlock() {
    const normalizedLocation = vaultLocation.trim();
    if (!normalizedLocation) {
      setCopyFeedback('Informe a localização do arquivo antes de desbloquear.');
      return;
    }

    if (!masterPassword || !unlockInput || unlockInput !== masterPassword) {
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed' }));
      return;
    }

    const loadedState = await resolveVaultForLocation(normalizedLocation, masterPassword);
    setVault(loadedState.vault);
    setEncryptedMasterSecret(loadedState.persistedMasterSecret);
    setMasterPassword(loadedState.resolvedMasterPassword);
    window.localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, loadedState.resolvedMasterPassword);
    window.localStorage.setItem(VAULT_LOCATION_STORAGE_KEY, normalizedLocation);
    setSessionLock((current) => unlockSessionLock(current, 'master-password'));
    setUnlockInput('');
    setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_success' }));
  }

  async function handleUnlockWithTouchId() {
    try {
      const unlocked = await unlockWithTouchId();
      if (!unlocked) {
        setCopyFeedback('Touch ID não disponível neste navegador/dispositivo.');
        return;
      }

      setSessionLock((current) => unlockSessionLock(current, 'touch-id'));
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_success', metadata: { method: 'touch-id' } }));
      setUnlockInput('');
    } catch {
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed', metadata: { method: 'touch-id' } }));
      setCopyFeedback('Falha ao autenticar com Touch ID.');
    }
  }

  const showOnboarding = vault.entries.length === 0;
  const isSearching = searchTerm.trim().length > 0;
  const recentEvents = listRecentAuditEvents(auditLog, 8);

  if (isLoadingVault) {
    return (
      <main className="container">
        <section className="card lock-screen">
          <h1>PasswordManager</h1>
          <p>Carregando cofre padrão...</p>
        </section>
      </main>
    );
  }

  if (isSessionLocked(sessionLock)) {
    return (
      <main className="container">
        <section className="card lock-screen">
          <h1>Password Manage</h1>
          <label>
            Localização do arquivo de senhas
            <input
              type="text"
              value={vaultLocation}
              disabled={!isLocationEditable}
              onChange={(event) => handleVaultLocationChange(event.target.value)}
              placeholder="Ex: password-manager.vault.csv"
            />
          </label>
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
            Habilitar edição do caminho
          </label>
          <div className="actions-row">
            <button type="button" onClick={handleSaveVaultLocation} disabled={!isLocationEditable}>
              Salvar caminho
            </button>
            <button type="button" onClick={handleSelectExistingVault}>
              Selecionar arquivo existente
            </button>
            <button type="button" onClick={handleCreateVaultFromLockScreen}>
              Criar arquivo do cofre
            </button>
          </div>
          <label>
            Senha
            <input type="password" value={unlockInput} onChange={(event) => setUnlockInput(event.target.value)} />
          </label>
          <label>
            Localização do arquivo de senhas
            <input
              type="text"
              value={vaultLocation}
              disabled={!isLocationEditable}
              onChange={(event) => setVaultLocation(event.target.value)}
              placeholder="ex: vault/principal"
            />
          </label>
          <button type="button" className="secondary-btn" onClick={() => setIsLocationEditable((current) => !current)}>
            {isLocationEditable ? 'Bloquear edição do caminho' : 'Habilitar edição do caminho'}
          </button>
          <button type="button" onClick={handleUnlock}>
            Desbloquear
          </button>
          <button type="button" onClick={handleUnlockWithTouchId}>
            Desbloquear com Touch ID (Mac)
          </button>
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
        <aside className="card sidebar">
          <h2>Explorer</h2>
          <button type="button" onClick={() => setSelectedFolderId('root')} className="tree-root">
            🗂️ Vault
          </button>
          <FolderTree vault={vault} parentId="root" selectedFolderId={selectedFolder.id} onSelect={setSelectedFolderId} />
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

          <div className="actions-row">
            <button type="button" onClick={handleCreateFolder}>+ Nova pasta</button>
            <button type="button" onClick={handleRenameFolder} disabled={selectedFolder.id === 'root'}>Renomear pasta</button>
            <button type="button" onClick={handleDeleteFolder} disabled={selectedFolder.id === 'root'}>Excluir pasta</button>
            <button type="button" onClick={handleCreateEntry}>+ Nova credencial</button>
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
                    <button type="button" onClick={() => handleCopyPassword(entry)}>Copiar senha</button>
                    <button type="button" onClick={() => handleEditEntry(entry)}>Editar</button>
                    <button type="button" onClick={() => handleDeleteEntry(entry.id)}>Excluir</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </section>

      <section className="card">
        <h2>Sugestão de senha forte</h2>
        <label>
          Senha mestra para reautenticação
          <input type="password" value={masterPassword} onChange={(event) => setMasterPassword(event.target.value)} />
        </label>
        <button type="button" onClick={handleUpdateMasterPassword}>Salvar nova senha mestra</button>
        <button type="button" onClick={handleGeneratePassword}>Gerar senha</button>
        {generatedPassword && <code>{generatedPassword}</code>}
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
    </main>
  );
}
