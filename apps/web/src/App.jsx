import { useEffect, useMemo, useState } from 'react';

import {
  createEmptyVault,
  createEntry,
  createFolder,
  createLocalStorageVaultRepository,
  deleteEntry,
  deleteFolder,
  generateStrongPassword,
  getChildFolders,
  getEntriesByFolder,
  getFolderPath,
  renameFolder,
  updateEntry
} from '@password-manager/core';

const repository = createLocalStorageVaultRepository();

function FolderTree({ vault, parentId, selectedFolderId, onSelect }) {
  const children = getChildFolders(vault, parentId);

  if (children.length === 0) {
    return null;
  }

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

export function App() {
  const [vault, setVault] = useState(createEmptyVault());
  const [selectedFolderId, setSelectedFolderId] = useState('root');
  const [generatedPassword, setGeneratedPassword] = useState('');

  useEffect(() => {
    repository.load().then(setVault);
  }, []);

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

  async function commit(nextVault) {
    setVault(nextVault);
    await repository.save(nextVault);
  }

  async function handleCreateFolder() {
    const name = window.prompt('Nome da nova pasta:');
    if (!name) return;

    const nextVault = createFolder(vault, { parentId: selectedFolder.id, name });
    await commit(nextVault);
  }

  async function handleRenameFolder() {
    if (selectedFolder.id === 'root') return;

    const name = window.prompt('Novo nome da pasta:', selectedFolder.name);
    if (!name) return;

    const nextVault = renameFolder(vault, {
      folderId: selectedFolder.id,
      name
    });
    await commit(nextVault);
  }

  async function handleDeleteFolder() {
    if (selectedFolder.id === 'root') return;
    const confirmed = window.confirm('Excluir esta pasta e todos os dados internos?');
    if (!confirmed) return;

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

    const nextVault = createEntry(vault, {
      folderId: selectedFolder.id,
      title,
      username,
      password
    });

    await commit(nextVault);
  }

  async function handleEditEntry(entry) {
    const title = window.prompt('Editar título:', entry.title);
    if (!title) return;

    const username = window.prompt('Editar usuário/login:', entry.username) || '';
    const password = window.prompt('Editar senha:', entry.password) || '';

    const nextVault = updateEntry(vault, {
      entryId: entry.id,
      title,
      username,
      password
    });

    await commit(nextVault);
  }

  async function handleDeleteEntry(entryId) {
    const confirmed = window.confirm('Remover credencial?');
    if (!confirmed) return;

    const nextVault = deleteEntry(vault, { entryId });
    await commit(nextVault);
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

  return (
    <main className="container">
      <h1>PasswordManager</h1>
      <p>v0.2.0 com Explorer de pastas + persistência local.</p>

      <section className="layout">
        <aside className="card sidebar">
          <h2>Explorer</h2>
          <button type="button" onClick={() => setSelectedFolderId('root')} className="tree-root">
            🗂️ Vault
          </button>
          <FolderTree
            vault={vault}
            parentId="root"
            selectedFolderId={selectedFolder.id}
            onSelect={setSelectedFolderId}
          />
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
            <button type="button" onClick={handleCreateFolder}>
              + Nova pasta
            </button>
            <button type="button" onClick={handleRenameFolder} disabled={selectedFolder.id === 'root'}>
              Renomear pasta
            </button>
            <button type="button" onClick={handleDeleteFolder} disabled={selectedFolder.id === 'root'}>
              Excluir pasta
            </button>
            <button type="button" onClick={handleCreateEntry}>
              + Nova credencial
            </button>
          </div>

          <ul className="entries-list">
            {entries.length === 0 && <li>Nenhuma credencial nesta pasta.</li>}
            {entries.map((entry) => (
              <li key={entry.id} className="entry-item">
                <div>
                  <strong>{entry.title}</strong>
                  <p>
                    Usuário: {entry.username || '—'} · Senha: {entry.password || '—'}
                  </p>
                </div>
                <div className="entry-actions">
                  <button type="button" onClick={() => handleEditEntry(entry)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteEntry(entry.id)}>
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="card">
        <h2>Sugestão de senha forte</h2>
        <button type="button" onClick={handleGeneratePassword}>
          Gerar senha
        </button>
        {generatedPassword && <code>{generatedPassword}</code>}
      </section>
    </main>
  );
}
