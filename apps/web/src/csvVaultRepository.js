import { createEmptyVault } from '@password-manager/core';

const FILE_NAME = 'password-manager.vault.csv';
const HANDLE_DB_NAME = 'password-manager-storage';
const HANDLE_STORE_NAME = 'handles';
const HANDLE_KEY = 'default-vault-handle';

let fileHandle;

function encodePayload(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodePayload(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(HANDLE_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(HANDLE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function readPersistedHandle() {
  if (!window.indexedDB) return null;
  const db = await openHandleDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
    const request = tx.objectStore(HANDLE_STORE_NAME).get(HANDLE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
    tx.oncomplete = () => db.close();
  });
}

async function persistHandle(handle) {
  if (!window.indexedDB) return;
  const db = await openHandleDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    tx.objectStore(HANDLE_STORE_NAME).put(handle, HANDLE_KEY);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });

  db.close();
}

async function pickExistingFileHandle() {
  if (!window.showOpenFilePicker) return null;

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: 'Vault CSV',
        accept: {
          'text/csv': ['.csv']
        }
      }
    ]
  });

  return handle || null;
}

async function createNewFileHandle() {
  if (!window.showSaveFilePicker) return null;
  return window.showSaveFilePicker({
    suggestedName: FILE_NAME,
    types: [
      {
        description: 'Vault CSV',
        accept: {
          'text/csv': ['.csv']
        }
      }
    ]
  });
}

async function promptForFileHandle() {
  let handle = null;

  try {
    handle = await pickExistingFileHandle();
  } catch {
    handle = null;
  }

  if (!handle) {
    handle = await createNewFileHandle();
  }

  if (!handle) return null;
  await persistHandle(handle);
  return handle;
}

async function ensureReadWritePermission(handle) {
  if (!handle?.queryPermission || !handle?.requestPermission) return true;

  const options = { mode: 'readwrite' };
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  return (await handle.requestPermission(options)) === 'granted';
}

async function ensureFileHandle() {
  if (fileHandle) return fileHandle;

  try {
    fileHandle = await readPersistedHandle();
  } catch {
    fileHandle = null;
  }

  if (fileHandle) {
    const hasPermission = await ensureReadWritePermission(fileHandle);
    if (hasPermission) {
      return fileHandle;
    }
    fileHandle = null;
  }

  fileHandle = await promptForFileHandle();
  return fileHandle;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return { vault: createEmptyVault(), encryptedMasterSecret: null };
  }

  const vault = createEmptyVault();
  vault.folders = [];
  vault.entries = [];
  let encryptedMasterSecret = null;

  for (const line of lines.slice(1)) {
    const [kind, encodedPayload = ''] = line.split(',', 2);
    if (!kind || !encodedPayload) continue;

    const payload = decodePayload(encodedPayload);

    if (kind === 'meta' && payload.key === 'encryptedMasterSecret') {
      encryptedMasterSecret = String(payload.value || '');
      continue;
    }

    if (kind === 'folder') {
      vault.folders.push(payload);
      continue;
    }

    if (kind === 'entry') {
      vault.entries.push(payload);
    }
  }

  if (!vault.folders.some((folder) => folder.id === 'root')) {
    vault.folders.unshift(createEmptyVault().folders[0]);
  }

  return { vault, encryptedMasterSecret };
}

function toCsv({ vault, encryptedMasterSecret }) {
  const rows = ['kind,payload'];

  rows.push(`meta,${encodePayload({ key: 'encryptedMasterSecret', value: encryptedMasterSecret })}`);

  for (const folder of vault.folders) {
    rows.push(`folder,${encodePayload(folder)}`);
  }

  for (const entry of vault.entries) {
    rows.push(`entry,${encodePayload(entry)}`);
  }

  return `${rows.join('\n')}\n`;
}

export function createCsvVaultRepository() {
  return {
    async load() {
      const handle = await ensureFileHandle();
      if (!handle) {
        return { vault: createEmptyVault(), encryptedMasterSecret: null };
      }

      let file;
      try {
        file = await handle.getFile();
      } catch {
        fileHandle = await promptForFileHandle();
        if (!fileHandle) {
          return { vault: createEmptyVault(), encryptedMasterSecret: null };
        }
        file = await fileHandle.getFile();
      }

      const text = await file.text();
      if (!text.trim()) {
        return { vault: createEmptyVault(), encryptedMasterSecret: null };
      }

      return parseCsv(text);
    },

    async save(data) {
      const handle = await ensureFileHandle();
      if (!handle) return;

      const writable = await handle.createWritable();
      await writable.write(toCsv(data));
      await writable.close();
    }
  };
}
