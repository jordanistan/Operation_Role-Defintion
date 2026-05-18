import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { STORAGE_CONTRACT_VERSION } from './storage-contract.js';
import {
  DEFAULT_STATE,
  DEFAULT_WORKSPACE,
  REVIEW_STATUSES,
  allowedCollections,
  assertCollection,
  auditEntry,
  sanitizeRecord
} from './store-utils.js';

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.contractVersion = STORAGE_CONTRACT_VERSION;
  }

  async read() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (error) {
      if (error.code === 'ENOENT') return structuredClone(DEFAULT_STATE);
      throw error;
    }
  }

  async readWorkspace(workspaceId) {
    const state = await this.read();
    return {
      ...structuredClone(DEFAULT_WORKSPACE),
      ...(state.workspaces[workspaceId] || {})
    };
  }

  async write(state) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    return state;
  }

  async saveProfile(workspaceId, profile) {
    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    workspace.profile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    workspace.auditLog.push(auditEntry('profile.updated', 'Business profile updated'));
    return this.write(state);
  }

  async saveOutput(workspaceId, output) {
    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reviewStatus: 'pending',
      reviewedAt: null,
      ...output
    };
    workspace.outputs.unshift(record);
    capturePlaceholders(workspace, record);
    workspace.auditLog.push(auditEntry('assistant.output_created', output.auditSummary));
    await this.write(state);
    return record;
  }

  async updateOutputReview(workspaceId, outputId, reviewStatus) {
    if (!REVIEW_STATUSES.has(reviewStatus)) {
      throw Object.assign(new Error('Invalid reviewStatus'), { statusCode: 400 });
    }

    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    const output = workspace.outputs.find((item) => item.id === outputId);

    if (!output) {
      throw Object.assign(new Error('Output not found'), { statusCode: 404 });
    }

    output.reviewStatus = reviewStatus;
    output.reviewedAt = new Date().toISOString();
    workspace.auditLog.push(auditEntry(
      'assistant.output_review_updated',
      `${output.label || 'Assistant output'} marked ${reviewStatus}`
    ));

    await this.write(state);
    return output;
  }

  async createRecord(workspaceId, collection, record) {
    assertCollection(collection);
    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    const now = new Date().toISOString();
    const saved = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...sanitizeRecord(collection, record)
    };

    workspace[collection].unshift(saved);
    workspace.auditLog.push(auditEntry(`${collection}.created`, `${collection} record created`));
    await this.write(state);
    return saved;
  }

  async updateRecord(workspaceId, collection, recordId, record) {
    assertCollection(collection);
    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    const existing = workspace[collection].find((item) => item.id === recordId);

    if (!existing) {
      throw Object.assign(new Error('Record not found'), { statusCode: 404 });
    }

    Object.assign(existing, sanitizeRecord(collection, record), {
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    });
    workspace.auditLog.push(auditEntry(`${collection}.updated`, `${collection} record updated`));
    await this.write(state);
    return existing;
  }

  async deleteRecord(workspaceId, collection, recordId) {
    assertCollection(collection);
    const state = await this.read();
    const workspace = ensureWorkspace(state, workspaceId);
    const index = workspace[collection].findIndex((item) => item.id === recordId);

    if (index === -1) {
      throw Object.assign(new Error('Record not found'), { statusCode: 404 });
    }

    const [deleted] = workspace[collection].splice(index, 1);
    workspace.auditLog.push(auditEntry(`${collection}.deleted`, `${collection} record deleted`));
    await this.write(state);
    return deleted;
  }
}

function ensureWorkspace(state, workspaceId) {
  state.workspaces ||= {};
  state.workspaces[workspaceId] ||= structuredClone(DEFAULT_WORKSPACE);
  return state.workspaces[workspaceId];
}

function capturePlaceholders(workspace, record) {
  if (record.action === 'create_sop') {
    workspace.sops.unshift({
      id: crypto.randomUUID(),
      sourceOutputId: record.id,
      title: record.label,
      status: 'draft',
      createdAt: record.createdAt
    });
  }

  if (record.action === 'process_audit' || record.action === 'automation_assessment') {
    workspace.workflows.unshift({
      id: crypto.randomUUID(),
      sourceOutputId: record.id,
      type: record.action,
      status: 'review_needed',
      createdAt: record.createdAt
    });
  }

  if (record.action === 'daily_review' || record.action === 'weekly_review') {
    workspace.tasks.unshift({
      id: crypto.randomUUID(),
      sourceOutputId: record.id,
      title: `${record.label} follow-up`,
      status: 'open',
      createdAt: record.createdAt
    });
  }

  workspace.kpiHistory.unshift({
    id: crypto.randomUUID(),
    sourceOutputId: record.id,
    action: record.action,
    status: 'review_needed',
    createdAt: record.createdAt
  });
}

export { allowedCollections };
