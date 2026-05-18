import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonStore } from '../src/store.js';

test('JsonStore persists profile, outputs, and audit log', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-assistant-'));
  const store = new JsonStore(join(dir, 'state.json'));

  try {
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

    const state = await store.readWorkspace('demo-client');
    assert.equal(state.profile.businessName, 'Stem Vase');
    assert.equal(state.outputs[0].id, output.id);
    assert.equal(state.outputs[0].reviewStatus, 'pending');
    assert.equal(state.auditLog.length, 2);
    assert.equal(state.tasks[0].sourceOutputId, output.id);
    assert.equal(state.kpiHistory[0].sourceOutputId, output.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JsonStore updates output review status and audit log', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-assistant-'));
  const store = new JsonStore(join(dir, 'state.json'));

  try {
    const output = await store.saveOutput('demo-client', {
      action: 'daily_review',
      label: 'Daily Review',
      auditSummary: 'Daily review generated'
    });

    const updated = await store.updateOutputReview('demo-client', output.id, 'approved');
    const state = await store.readWorkspace('demo-client');

    assert.equal(updated.reviewStatus, 'approved');
    assert.equal(Boolean(updated.reviewedAt), true);
    assert.equal(state.outputs[0].reviewStatus, 'approved');
    assert.equal(state.auditLog.at(-1).type, 'assistant.output_review_updated');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JsonStore rejects invalid review status and missing output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-assistant-'));
  const store = new JsonStore(join(dir, 'state.json'));

  try {
    await assert.rejects(
      () => store.updateOutputReview('demo-client', 'missing-output-id', 'approved'),
      /Output not found/
    );

    await assert.rejects(
      () => store.updateOutputReview('demo-client', 'missing-output-id', 'bad_status'),
      /Invalid reviewStatus/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JsonStore creates, updates, and deletes workspace records', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-assistant-'));
  const store = new JsonStore(join(dir, 'state.json'));

  try {
    const created = await store.createRecord('demo-client', 'tasks', {
      title: 'Call vendor',
      owner: 'Jordan',
      notes: 'Confirm delivery window'
    });

    assert.equal(created.title, 'Call vendor');
    assert.equal(created.status, 'open');

    const updated = await store.updateRecord('demo-client', 'tasks', created.id, {
      title: 'Call vendor today',
      status: 'done'
    });

    assert.equal(updated.title, 'Call vendor today');
    assert.equal(updated.status, 'done');
    assert.equal(Boolean(updated.updatedAt), true);

    const deleted = await store.deleteRecord('demo-client', 'tasks', created.id);
    const state = await store.readWorkspace('demo-client');

    assert.equal(deleted.id, created.id);
    assert.equal(state.tasks.length, 0);
    assert.equal(state.auditLog.at(-1).type, 'tasks.deleted');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('JsonStore validates record collection, title, and IDs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ops-assistant-'));
  const store = new JsonStore(join(dir, 'state.json'));

  try {
    await assert.rejects(
      () => store.createRecord('demo-client', 'badCollection', { title: 'Bad' }),
      /Invalid collection/
    );

    await assert.rejects(
      () => store.createRecord('demo-client', 'tasks', { title: '' }),
      /title is required/
    );

    await assert.rejects(
      () => store.updateRecord('demo-client', 'tasks', 'missing-id', { title: 'Missing' }),
      /Record not found/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
