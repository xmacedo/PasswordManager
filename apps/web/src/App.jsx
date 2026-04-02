import { useEffect, useMemo, useState } from 'react';

import {
  appendAuditEvent,
  assessPasswordBreachRisk,
  createAuditLog,
  createEmptyVault,
  createEntry,
  createFolder,
  createLocalStorageVaultRepository,
  createSessionLock,
  deleteEntry,
  deleteFolder,
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

const repository = createLocalStorageVaultRepository();

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

export function App() {
  const [vault, setVault] = useState(createEmptyVault());
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState({});
  const [copyFeedback, setCopyFeedback] = useState('');
  const [auditLog, setAuditLog] = useState(createAuditLog());
  const [sessionLock, setSessionLock] = useState(() => unlockSessionLock(createSessionLock({ timeoutMs: 90_000 })));
  const [masterPassword, setMasterPassword] = useState('vault123');
  const [unlockInput, setUnlockInput] = useState('');

  useEffect(() => {
    repository.load().then(setVault);
  }, []);

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

  async function commit(nextVault, eventType, metadata = {}) {
    setVault(nextVault);
    setAuditLog((current) => appendAuditEvent(current, { type: eventType, metadata }));
    setSessionLock((current) => touchSessionLock(current));
    await repository.save(nextVault);
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

  function handleUnlock() {
    if (unlockInput !== masterPassword) {
      setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_failed' }));
      return;
    }

    setSessionLock((current) => unlockSessionLock(current, 'master-password'));
    setUnlockInput('');
    setAuditLog((current) => appendAuditEvent(current, { type: 'security.unlock_success' }));
  }

  const showOnboarding = vault.entries.length === 0;
  const isSearching = searchTerm.trim().length > 0;
  const recentEvents = listRecentAuditEvents(auditLog, 8);

  if (isSessionLocked(sessionLock)) {
    return (
      <main className="container">
        <section className="card lock-screen">
          <h1>Vault bloqueado</h1>
          <p>Sessão expirada por inatividade. Reautentique para continuar.</p>
          <label>
            Senha mestra
            <input type="password" value={unlockInput} onChange={(event) => setUnlockInput(event.target.value)} />
          </label>
          <button type="button" onClick={handleUnlock}>
            Desbloquear
          </button>
          <p className="helper">Dica para ambiente local: senha padrão é <code>vault123</code>.</p>
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
        <button type="button" onClick={handleGeneratePassword}>Gerar senha</button>
        {generatedPassword && <code>{generatedPassword}</code>}
      </section>

      <section className="card">
        <h2>Audit trail</h2>
        <ul className="audit-list">
          {recentEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.type}</strong> <span>{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
            </li>
          ))}
          {recentEvents.length === 0 && <li>Nenhum evento ainda.</li>}
        </ul>
      </section>
    </main>
  );
}
