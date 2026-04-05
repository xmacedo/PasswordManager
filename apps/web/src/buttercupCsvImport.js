import { createEmptyVault } from '@password-manager/core';

function nowIso() {
  return new Date().toISOString();
}

function normalizeHeader(value) {
  return String(value || '').trim();
}

function parseCsvRows(text) {
  const source = String(text || '');
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === '"') {
      if (inQuotes && source[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && source[index + 1] === '\n') {
        index += 1;
      }

      row.push(current);
      const hasContent = row.some((value) => String(value).trim().length > 0);
      if (hasContent) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current);
  const hasContent = row.some((value) => String(value).trim().length > 0);
  if (hasContent) {
    rows.push(row);
  }

  return rows;
}

function mapRowsToObjects(rows) {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  return dataRows.map((cells) => {
    const item = {};
    for (let index = 0; index < headers.length; index += 1) {
      const key = headers[index];
      if (!key) continue;
      item[key] = String(cells[index] || '');
    }
    return item;
  });
}

function toFolderPath(segmentsByGroupId, groupId) {
  const segments = segmentsByGroupId.get(groupId);
  if (!segments || segments.length === 0) return null;
  return segments.join('/');
}

function ensureFolder(vault, folderPath, folderIdByPath) {
  const pathParts = String(folderPath || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (pathParts.length === 0) {
    return 'root';
  }

  let parentId = 'root';
  let absolutePath = '';

  for (const part of pathParts) {
    absolutePath = absolutePath ? `${absolutePath}/${part}` : part;

    if (folderIdByPath.has(absolutePath)) {
      parentId = folderIdByPath.get(absolutePath);
      continue;
    }

    const folderId = `fld_import_${folderIdByPath.size + 1}`;
    const timestamp = nowIso();
    vault.folders.push({
      id: folderId,
      parentId,
      name: part,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    folderIdByPath.set(absolutePath, folderId);
    parentId = folderId;
  }

  return parentId;
}

export function importButtercupCsvToVault(csvText) {
  const rows = parseCsvRows(csvText);
  const records = mapRowsToObjects(rows);

  const hasButtercupShape = records.some((record) => record['!type']);
  if (!hasButtercupShape) {
    throw new Error('CSV não parece ser um export do Buttercup (campo !type ausente).');
  }

  const vault = createEmptyVault();
  vault.entries = [];

  const groupRecords = records.filter((record) => record['!type'] === 'group');
  const entryRecords = records.filter((record) => record['!type'] === 'entry');

  const groupsById = new Map();
  for (const group of groupRecords) {
    if (!group['!group_id']) continue;
    groupsById.set(group['!group_id'], group);
  }

  const segmentsByGroupId = new Map();
  function resolveSegments(groupId, chain = new Set()) {
    if (!groupId || groupId === '0') return [];
    if (segmentsByGroupId.has(groupId)) return segmentsByGroupId.get(groupId);
    if (chain.has(groupId)) return [];

    chain.add(groupId);

    const group = groupsById.get(groupId);
    if (!group) {
      segmentsByGroupId.set(groupId, []);
      return [];
    }

    const parentId = String(group['!group_parent'] || '0');
    const parentSegments = parentId && parentId !== '0' ? resolveSegments(parentId, chain) : [];
    const name = String(group['!group_name'] || '').trim();
    const segments = name ? [...parentSegments, name] : parentSegments;
    segmentsByGroupId.set(groupId, segments);
    return segments;
  }

  for (const groupId of groupsById.keys()) {
    resolveSegments(groupId);
  }

  const folderIdByPath = new Map();
  let importedEntries = 0;

  for (const entry of entryRecords) {
    const title = String(entry.title || '').trim();
    if (!title) continue;

    const groupPath = toFolderPath(segmentsByGroupId, entry['!group_id']);
    const folderId = ensureFolder(vault, groupPath, folderIdByPath);
    const timestamp = nowIso();

    vault.entries.push({
      id: String(entry.id || `ent_import_${importedEntries + 1}`),
      folderId,
      title,
      username: String(entry.username || '').trim(),
      password: String(entry.password || ''),
      createdAt: timestamp,
      updatedAt: timestamp
    });

    importedEntries += 1;
  }

  return {
    vault,
    summary: {
      groups: groupRecords.length,
      entries: importedEntries
    }
  };
}
