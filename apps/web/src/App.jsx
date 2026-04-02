import { useEffect, useMemo, useState } from 'react';

import {
  checkPasswordBreach,
  configureSessionTimeout,
  createAuditEvent,
  createEmptyVault,
  createEntry,
  createFolder,
  createLocalStorageAuditRepository,
  createLocalStorageVaultRepository,
  createSessionState,
  deleteEntry,
  deleteFolder,
  generateStrongPassword,
  getChildFolders,
  getEntriesByFolder,
  getFolderPath,
  hashMasterPassword,
  lockSession,
  renameFolder,
  shouldAutoLock,
  touchSession,
  unlockSession,
  updateEntry
} from '@password-manager/core';

const repository = createLocalStorageVaultRepository();
const auditRepository = createLocalStorageAuditRepository();

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
          <FolderTree
            vault={vault}
            parentId={folder.id}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
          />
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
  const [auditEvents, setAuditEvents] = useState([]);
  const [session, setSession] = useState(
    createSessionState({
      timeoutMs: 120000,
      masterPasswordHash: hashMasterPassword('master123')
    })
  );
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    repository.load().then(setVault);
    auditRepository.list().then(setAuditEvents);
  }, []);

  useEffect(() => {
    const onActivity = () => setSession((current) => touchSession(current));
    const events = ['click', 'mousemove', 'keydown', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, onActivity));

    const timer = window.setInterval(() => {
      setSession((current) => {
        if (shouldAutoLock(current)) {
          pushAudit('vault.auto_lock', { timeoutMs: current.timeoutMs }, 'warning');
          return lockSession(current);
        }

        return current;
      });
    }, 1500);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.clearInterval(timer);
    };
  }, []);

  async function pushAudit(action, details = {}, severity = 'info') {
    const event = createAuditEvent({ action, details, severity });
    const next = await auditRepository.append(event);
    setAuditEvents(next);
  }

  const selectedFolder = useMemo(
    () => vault.folders.find((folder) => folder.id === selectedFolderId) || vault.folders[0],
    [vault, selectedFolderId]
  );

  const entries = useMemo(
    () => getEntriesByFolder(vault, selectedFolder?.id || 'root'),
    [vault, selectedFolder]
  );

  const folderPath = useMemo(
    () => getFolderPath(vault, selectedFolder?.id || 'root'),
    [vault, selectedFolder]
  );

  const filteredEntries = useMemo(() => {
    const source = searchScope === 'current-folder' ? entries : vault.entries;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return source;

    return source.filter((entry) => [entry.title, entry.username, entry.password].join(' ').toLowerCase().includes(term));
  }, [entries, searchScope, searchTerm, vault.entries]);

  async function commit(nextVault) {
    setVault(nextVault);
    await repository.save(nextVault);
  }

  async function handleCreateFolder() {
    const name = window.prompt('Nome da nova pasta:');
    if (!name) return;

    const nextVault = createFolder(vault, { parentId: selectedFolder.id, name });
    await commit(nextVault);
    await pushAudit('folder.created', { name, parentId: selectedFolder.id });
  }

  async function handleRenameFolder() {
    if (selectedFolder.id === 'root') return;
    const name = window.prompt('Novo nome da pasta:', selectedFolder.name);
    if (!name) return;

    const nextVault = renameFolder(vault, { folderId: selectedFolder.id, name });
    await commit(nextVault);
    await pushAudit('folder.renamed', { folderId: selectedFolder.id, name });
  }

  async function handleDeleteFolder() {
    if (selectedFolder.id === 'root') return;
    const confirmed = window.confirm('Excluir esta pasta e todos os dados internos?');
    if (!confirmed) return;

    await pushAudit('folder.deleted', { folderId: selectedFolder.id }, 'warning');
    const nextVault = deleteFolder(vault, { folderId: selectedFolder.id });
    setSelectedFolderId(selectedFolder.parentId || 'root');
    await commit(nextVault);
  }

  async function handleCreateEntry() {
    const title = window.prompt('Título da credencial (ex: GitHub):');
    if (!title) return;

    const username = window.prompt('Usuário/Login:') || '';
    const password =
      window.prompt('Senha (deixe vazio para gerar uma forte):') || generateStrongPassword({ length: 20 });

    const breach = checkPasswordBreach(password);
    if (breach.breached) {
      window.alert('⚠️ Senha potencialmente comprometida. Revise antes de salvar.');
      await pushAudit('entry.breach_detected', { title, reason: breach.reason }, 'warning');
    }

    const nextVault = createEntry(vault, { folderId: selectedFolder.id, title, username, password });
    await commit(nextVault);
    await pushAudit('entry.created', { title, folderId: selectedFolder.id });
  }

  async function handleEditEntry(entry) {
    const title = window.prompt('Editar título:', entry.title);
    if (!title) return;

    const username = window.prompt('Editar usuário/login:', entry.username) || '';
    const password = window.prompt('Editar senha:', entry.password) || '';

    const breach = checkPasswordBreach(password);
    if (breach.breached) {
      window.alert('⚠️ Senha potencialmente comprometida.');
      await pushAudit('entry.breach_detected', { entryId: entry.id, reason: breach.reason }, 'warning');
    }

    const nextVault = updateEntry(vault, { entryId: entry.id, title, username, password });
    await commit(nextVault);
    await pushAudit('entry.updated', { entryId: entry.id });
  }

  async function handleDeleteEntry(entryId) {
    const confirmed = window.confirm('Remover credencial?');
    if (!confirmed) return;

    const nextVault = deleteEntry(vault, { entryId });
    await commit(nextVault);
    await pushAudit('entry.deleted', { entryId }, 'warning');
  }

  function getFolderName(folderId) {
    return vault.folders.find((folder) => folder.id === folderId)?.name || 'Sem pasta';
  }

  function handleToggleReveal(entryId) {
    setVisiblePasswordIds((current) => ({ ...current, [entryId]: !current[entryId] }));
    pushAudit('entry.password_revealed', { entryId });
  }

  async function handleCopyPassword(entry) {
    const didCopy = await copyText(entry.password);
    setCopyFeedback(didCopy ? `Senha de "${entry.title}" copiada.` : 'Não foi possível copiar a senha.');
    await pushAudit('entry.password_copied', { entryId: entry.id, ok: didCopy });

    window.setTimeout(() => setCopyFeedback(''), 2500);
  }

  function handleUnlock() {
    const next = unlockSession(session, unlockInput);
    setSession(next);

    if (next.locked) {
      setUnlockError('Senha mestra inválida. Tente novamente.');
      pushAudit('vault.unlock_failed', {}, 'warning');
      return;
    }

    setUnlockError('');
    setUnlockInput('');
    pushAudit('vault.unlocked');
  }

  const handleGeneratePassword = () => {
    setGeneratedPassword(
      generateStrongPassword({
        length: 20,
        useDigits: true,
        useLowercase: true,
        useUppercase: true,
        useSymbols: true
      })
    );
  };

  const showOnboarding = vault.entries.length === 0;
  const isSearching = searchTerm.trim().length > 0;

  if (session.locked) {
    return (
      <main className="container">
        <h1>PasswordManager</h1>
        <p>Cofre bloqueado por segurança. Reautentique para continuar.</p>
        <section className="card">
          <h2>Desbloquear cofre</h2>
          <p>Senha mestra demo: <strong>master123</strong></p>
          <input
            type="password"
            value={unlockInput}
            placeholder="Digite a senha mestra"
            onChange={(event) => setUnlockInput(event.target.value)}
          />
          <div className="actions-row">
            <button type="button" onClick={handleUnlock}>Desbloquear</button>
            <button type="button" onClick={() => setSession((current) => configureSessionTimeout(current, 30000))}>
              Timeout 30s
            </button>
            <button type="button" onClick={() => setSession((current) => configureSessionTimeout(current, 120000))}>
              Timeout 2min
            </button>
          </div>
          {unlockError && <p className="feedback">{unlockError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>PasswordManager</h1>
      <p>v0.4.0 com hardening: auto-lock, reautenticação, breach check e auditoria.</p>

      <section className="layout">
        <aside className="card sidebar">
          <h2>Explorer</h2>
          <button type="button" onClick={() => setSelectedFolderId('root')} className="tree-root">🗂️ Vault</button>
          <FolderTree vault={vault} parentId="root" selectedFolderId={selectedFolder.id} onSelect={setSelectedFolderId} />
        </aside>

        <section className="card content">
          <h2>{selectedFolder.name}</h2>
          <div className="breadcrumb">
            {folderPath.map((folder, index) => (
              <span key={folder.id}>
                {index > 0 && ' / '}
                <button type="button" onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</button>
              </span>
            ))}
          </div>

          <div className="actions-row">
            <button type="button" onClick={handleCreateFolder}>+ Nova pasta</button>
            <button type="button" onClick={handleRenameFolder} disabled={selectedFolder.id === 'root'}>Renomear pasta</button>
            <button type="button" onClick={handleDeleteFolder} disabled={selectedFolder.id === 'root'}>Excluir pasta</button>
            <button type="button" onClick={handleCreateEntry}>+ Nova credencial</button>
            <button type="button" onClick={() => setSession((current) => lockSession(current))}>Bloquear agora</button>
          </div>

          <div className="search-bar">
            <input type="search" placeholder="Buscar por título, usuário ou senha" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
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
                {isSearching ? 'Nenhuma credencial encontrada com este filtro de busca.' : 'Nenhuma credencial nesta pasta. Clique em “+ Nova credencial” para começar.'}
              </li>
            )}
            {filteredEntries.map((entry) => {
              const breach = checkPasswordBreach(entry.password);

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
                    {breach.breached && <p className="feedback">⚠️ risco {breach.risk}: {breach.reason}</p>}
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
        <button type="button" onClick={handleGeneratePassword}>Gerar senha</button>
        {generatedPassword && <code>{generatedPassword}</code>}
      </section>

      <section className="card">
        <h2>Logs de segurança (auditoria)</h2>
        <ul className="entries-list">
          {auditEvents.slice(0, 8).map((event) => (
            <li key={event.id} className="entry-item">
              <div>
                <strong>{event.action}</strong>
                <p>{new Date(event.createdAt).toLocaleString()}</p>
                <p>Severidade: {event.severity}</p>
              </div>
            </li>
          ))}
          {auditEvents.length === 0 && <li className="empty-state">Sem eventos registrados ainda.</li>}
        </ul>
      </section>
    </main>
  );
}
