import { createEmptyVault } from '@password-manager/core';

const FILE_NAME = 'password-manager.vault.csv';

let fileHandle;

function encodePayload(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodePayload(encoded) {
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

async function ensureFileHandle() {
  if (fileHandle) return fileHandle;

  if (!window.showSaveFilePicker) {
    return null;
  }

  fileHandle = await window.showSaveFilePicker({
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

      const file = await handle.getFile();
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
