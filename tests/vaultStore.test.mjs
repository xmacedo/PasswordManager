import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyVault,
  createEntry,
  createFolder,
  deleteFolder,
  getEntriesByFolder,
  getFolderPath,
  renameFolder,
  updateEntry
} from '../packages/core/storage/vaultStore.js';

test('folder CRUD mantém hierarquia do explorer', () => {
  const empty = createEmptyVault();
  const withWork = createFolder(empty, { parentId: 'root', name: 'Trabalho' });
  const workFolder = withWork.folders.find((folder) => folder.name === 'Trabalho');

  const withSub = createFolder(withWork, { parentId: workFolder.id, name: 'Clientes' });
  const subFolder = withSub.folders.find((folder) => folder.name === 'Clientes');

  const path = getFolderPath(withSub, subFolder.id).map((folder) => folder.name);
  assert.deepEqual(path, ['Vault', 'Trabalho', 'Clientes']);

  const renamed = renameFolder(withSub, { folderId: workFolder.id, name: 'Work' });
  const renamedFolder = renamed.folders.find((folder) => folder.id === workFolder.id);
  assert.equal(renamedFolder.name, 'Work');
});

test('entries são vinculadas a pastas e removidas em cascata', () => {
  const empty = createEmptyVault();
  const withFolder = createFolder(empty, { parentId: 'root', name: 'Bancos' });
  const bankFolder = withFolder.folders.find((folder) => folder.name === 'Bancos');

  const withEntry = createEntry(withFolder, {
    folderId: bankFolder.id,
    title: 'Conta Corrente',
    username: 'maria',
    password: 'segredo'
  });

  assert.equal(getEntriesByFolder(withEntry, bankFolder.id).length, 1);

  const entry = withEntry.entries[0];
  const updated = updateEntry(withEntry, {
    entryId: entry.id,
    title: 'Conta Premium',
    username: 'maria.s',
    password: 'novoSegredo'
  });

  assert.equal(updated.entries[0].title, 'Conta Premium');

  const afterDeleteFolder = deleteFolder(updated, { folderId: bankFolder.id });
  assert.equal(afterDeleteFolder.entries.length, 0);
});
