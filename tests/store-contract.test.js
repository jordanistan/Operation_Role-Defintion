import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { STORAGE_CONTRACT_VERSION } from '../src/storage-contract.js';
import { JsonStore } from '../src/store.js';
import { SQLiteStore } from '../src/sqlite-store.js';

const factories = [
  ['JsonStore', (dir) => new JsonStore(join(dir, 'state.json'))],
  ['SQLiteStore', (dir) => new SQLiteStore(join(dir, 'state.sqlite'))]
];

for (const [name, createStore] of factories) {
  test(`${name} satisfies profile, output, review, and record contract`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ops-contract-'));
    const store = createStore(dir);

    try {
      assert.equal(store.contractVersion, STORAGE_CONTRACT_VERSION);

      await store.saveProfile('demo-client', {
        businessName: 'Stem Vase',
        businessType: 'floral studio',
        teamSize: 'owner + 3'
      });

      const output = await store.saveOutput('demo-client', {
        action: 'daily_review',
        label: 'Daily Review',
        auditSummary: 'Daily review generated'
      });

      assert.equal(output.reviewStatus, 'pending');

      const reviewed = await store.updateOutputReview('demo-client', output.id, 'approved');
      assert.equal(reviewed.reviewStatus, 'approved');

      const task = await store.createRecord('demo-client', 'tasks', {
        title: 'Call vendor',
        owner: 'Jordan'
      });

      const updatedTask = await store.updateRecord('demo-client', 'tasks', task.id, {
        title: 'Call vendor today',
        status: 'done'
      });

      assert.equal(updatedTask.title, 'Call vendor today');
      assert.equal(updatedTask.status, 'done');

      await store.deleteRecord('demo-client', 'tasks', task.id);
      const workspace = await store.readWorkspace('demo-client');

      assert.equal(workspace.profile.businessName, 'Stem Vase');
      assert.equal(workspace.outputs[0].reviewStatus, 'approved');
      assert.equal(workspace.tasks.some((item) => item.id === task.id), false);
      assert.ok(workspace.auditLog.length >= 5);
    } finally {
      if (typeof store.close === 'function') store.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
}
