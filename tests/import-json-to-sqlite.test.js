import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { importJsonToSQLite } from '../src/import-json-to-sqlite.js';
import { JsonStore } from '../src/store.js';
import { SQLiteStore } from '../src/sqlite-store.js';

test('importJsonToSQLite copies JSON workspaces into SQLite', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-import-'));
  const jsonFile = join(dir, 'state.json');
  const sqliteFile = join(dir, 'state.sqlite');
  const jsonStore = new JsonStore(jsonFile);

  try {
    await jsonStore.saveProfile('demo-client', {
      businessName: 'Stem Vase',
      businessType: 'floral studio',
      teamSize: 'owner + 3'
    });
    await jsonStore.saveOutput('demo-client', {
      action: 'daily_review',
      label: 'Daily Review',
      auditSummary: 'Daily review generated'
    });
    await jsonStore.createRecord('demo-client', 'tasks', {
      title: 'Call vendor'
    });

    const result = await importJsonToSQLite({ jsonFile, sqliteFile });
    assert.equal(result.workspaceCount, 1);

    const sqliteStore = new SQLiteStore(sqliteFile);
    try {
      const workspace = await sqliteStore.readWorkspace('demo-client');
      assert.equal(workspace.profile.businessName, 'Stem Vase');
      assert.equal(workspace.outputs.length, 1);
      assert.equal(workspace.tasks.length, 2);
      assert.ok(workspace.auditLog.length >= 3);
    } finally {
      sqliteStore.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('importJsonToSQLite fails when JSON source is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-import-'));

  try {
    await assert.rejects(
      () => importJsonToSQLite({
        jsonFile: join(dir, 'missing.json'),
        sqliteFile: join(dir, 'state.sqlite')
      }),
      /ENOENT/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
