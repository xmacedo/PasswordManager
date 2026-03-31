const VAULT_STORAGE_KEY = 'password-manager.vault.v1';

function randomId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createEmptyVault() {
  const createdAt = nowIso();

  return {
    version: 1,
    folders: [
      {
        id: 'root',
        name: 'Vault',
        parentId: null,
        createdAt,
        updatedAt: createdAt
      }
    ],
    entries: []
  };
}

export function normalizeVault(rawVault = {}) {
  const fallback = createEmptyVault();
  const folders = Array.isArray(rawVault.folders) ? rawVault.folders : fallback.folders;
  const entries = Array.isArray(rawVault.entries) ? rawVault.entries : [];

  const hasRoot = folders.some((folder) => folder.id === 'root');

  return {
    version: 1,
    folders: hasRoot ? folders : [...fallback.folders, ...folders],
    entries
  };
}

export function createLocalStorageVaultRepository(storageKey = VAULT_STORAGE_KEY) {
  return {
    async load() {
      if (typeof localStorage === 'undefined') {
        return createEmptyVault();
      }

      const payload = localStorage.getItem(storageKey);
      if (!payload) {
        return createEmptyVault();
      }

      return normalizeVault(JSON.parse(payload));
    },

    async save(vault) {
      if (typeof localStorage === 'undefined') {
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(normalizeVault(vault)));
    }
  };
}

export function getChildFolders(vault, parentId = 'root') {
  return vault.folders.filter((folder) => folder.parentId === parentId);
}

export function getFolderPath(vault, folderId) {
  const path = [];
  let current = vault.folders.find((folder) => folder.id === folderId);

  while (current) {
    path.unshift(current);
    if (current.parentId === null) break;
    current = vault.folders.find((folder) => folder.id === current.parentId);
  }

  return path;
}

export function getEntriesByFolder(vault, folderId) {
  return vault.entries.filter((entry) => entry.folderId === folderId);
}

function collectDescendantFolderIds(vault, rootFolderId) {
  const queue = [rootFolderId];
  const ids = new Set([rootFolderId]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = getChildFolders(vault, currentId);

    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return ids;
}

export function createFolder(vault, { parentId = 'root', name }) {
  const parent = vault.folders.find((folder) => folder.id === parentId);
  if (!parent) {
    throw new Error('Pasta pai não encontrada.');
  }

  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Nome da pasta é obrigatório.');
  }

  const createdAt = nowIso();

  return {
    ...vault,
    folders: [
      ...vault.folders,
      {
        id: randomId('fld'),
        parentId,
        name: trimmedName,
        createdAt,
        updatedAt: createdAt
      }
    ]
  };
}

export function renameFolder(vault, { folderId, name }) {
  if (folderId === 'root') {
    throw new Error('A pasta raiz não pode ser renomeada.');
  }

  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Nome da pasta é obrigatório.');
  }

  return {
    ...vault,
    folders: vault.folders.map((folder) =>
      folder.id === folderId
        ? {
            ...folder,
            name: trimmedName,
            updatedAt: nowIso()
          }
        : folder
    )
  };
}

export function deleteFolder(vault, { folderId }) {
  if (folderId === 'root') {
    throw new Error('A pasta raiz não pode ser removida.');
  }

  const idsToDelete = collectDescendantFolderIds(vault, folderId);

  return {
    ...vault,
    folders: vault.folders.filter((folder) => !idsToDelete.has(folder.id)),
    entries: vault.entries.filter((entry) => !idsToDelete.has(entry.folderId))
  };
}

export function createEntry(vault, { folderId, title, username, password }) {
  const folder = vault.folders.find((item) => item.id === folderId);
  if (!folder) {
    throw new Error('Pasta da credencial não encontrada.');
  }

  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) {
    throw new Error('Título da credencial é obrigatório.');
  }

  const createdAt = nowIso();

  return {
    ...vault,
    entries: [
      ...vault.entries,
      {
        id: randomId('ent'),
        folderId,
        title: trimmedTitle,
        username: String(username || '').trim(),
        password: String(password || ''),
        createdAt,
        updatedAt: createdAt
      }
    ]
  };
}

export function updateEntry(vault, { entryId, title, username, password }) {
  const hasEntry = vault.entries.some((entry) => entry.id === entryId);
  if (!hasEntry) {
    throw new Error('Credencial não encontrada.');
  }

  return {
    ...vault,
    entries: vault.entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            title: String(title || entry.title).trim(),
            username: String(username || '').trim(),
            password: String(password || ''),
            updatedAt: nowIso()
          }
        : entry
    )
  };
}

export function deleteEntry(vault, { entryId }) {
  return {
    ...vault,
    entries: vault.entries.filter((entry) => entry.id !== entryId)
  };
}
