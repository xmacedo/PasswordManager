import test from 'node:test';
import assert from 'node:assert/strict';

import { importButtercupCsvToVault } from '../apps/web/src/buttercupCsvImport.js';

test('importa CSV do Buttercup com grupos e subgrupos', () => {
  const csv = `!type,!group_id,!group_name,!group_parent,title,username,password,id,URL\n"group","g-root","Pessoal","0",,,,\n"group","g-child","Email","g-root",,,,\n"entry","g-child",,,"Gmail","alice@example.com","Senha,com,virgula","entry-1","https://mail.google.com"\n`;

  const imported = importButtercupCsvToVault(csv);

  assert.equal(imported.summary.groups, 2);
  assert.equal(imported.summary.entries, 1);
  assert.equal(imported.vault.entries[0].title, 'Gmail');
  assert.equal(imported.vault.entries[0].username, 'alice@example.com');
  assert.equal(imported.vault.entries[0].password, 'Senha,com,virgula');

  const personal = imported.vault.folders.find((folder) => folder.name === 'Pessoal');
  const email = imported.vault.folders.find((folder) => folder.name === 'Email');
  assert.ok(personal);
  assert.ok(email);
  assert.equal(email.parentId, personal.id);
  assert.equal(imported.vault.entries[0].folderId, email.id);
});

test('falha quando csv não é do Buttercup', () => {
  const csv = 'title,username,password\nGithub,user,123\n';

  assert.throws(() => importButtercupCsvToVault(csv), /não parece ser um export do Buttercup/i);
});
