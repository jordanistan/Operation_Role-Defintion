import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { STORAGE_CONTRACT_VERSION } from './storage-contract.js';
import {
  DEFAULT_WORKSPACE,
  REVIEW_STATUSES,
  assertCollection,
  auditEntry,
  sanitizeRecord
} from './store-utils.js';

const COLLECTION_TABLES = {
  tasks: 'tasks',
  sops: 'sops',
  workflows: 'workflows',
  kpiHistory: 'kpi_entries'
};

const require = createRequire(import.meta.url);

export class SQLiteStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.contractVersion = STORAGE_CONTRACT_VERSION;
    mkdirSync(dirname(filePath), { recursive: true });
    const { DatabaseSync } = require('node:sqlite');
    this.db = new DatabaseSync(filePath);
    this.initialize();
  }

  initialize() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        workspace_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS assistant_outputs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        action TEXT,
        label TEXT,
        audit_summary TEXT,
        review_status TEXT NOT NULL,
        reviewed_at TEXT,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sops (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS kpi_entries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        type TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
    `);
  }

  async read() {
    const workspaces = {};
    for (const row of this.db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC').all()) {
      workspaces[row.id] = await this.readWorkspace(row.id);
    }
    return { workspaces };
  }

  async readWorkspace(workspaceId) {
    this.ensureWorkspace(workspaceId);
    return {
      ...structuredClone(DEFAULT_WORKSPACE),
      profile: this.readProfile(workspaceId),
      outputs: this.readOutputs(workspaceId),
      tasks: this.readRecords(workspaceId, 'tasks'),
      sops: this.readRecords(workspaceId, 'sops'),
      workflows: this.readRecords(workspaceId, 'workflows'),
      kpiHistory: this.readRecords(workspaceId, 'kpiHistory'),
      auditLog: this.readAuditLog(workspaceId)
    };
  }

  async write(state) {
    for (const [workspaceId, workspace] of Object.entries(state.workspaces || {})) {
      this.ensureWorkspace(workspaceId);
      if (workspace.profile) await this.saveProfile(workspaceId, workspace.profile);
      for (const output of workspace.outputs || []) this.insertOutput(workspaceId, output);
      for (const collection of Object.keys(COLLECTION_TABLES)) {
        for (const record of workspace[collection] || []) this.insertRecord(workspaceId, collection, record);
      }
      for (const entry of workspace.auditLog || []) this.insertAuditLog(workspaceId, entry);
    }
    return this.read();
  }

  async saveProfile(workspaceId, profile) {
    this.ensureWorkspace(workspaceId);
    const updatedAt = new Date().toISOString();
    const saved = { ...profile, updatedAt };
    this.db.prepare(`
      INSERT INTO profiles (workspace_id, data, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(workspaceId, JSON.stringify(saved), updatedAt);
    this.insertAuditLog(workspaceId, auditEntry('profile.updated', 'Business profile updated'));
    return this.read();
  }

  async saveOutput(workspaceId, output) {
    this.ensureWorkspace(workspaceId);
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      reviewStatus: 'pending',
      reviewedAt: null,
      ...output
    };
    this.insertOutput(workspaceId, record);
    this.capturePlaceholders(workspaceId, record);
    this.insertAuditLog(workspaceId, auditEntry('assistant.output_created', output.auditSummary));
    return record;
  }

  async updateOutputReview(workspaceId, outputId, reviewStatus) {
    if (!REVIEW_STATUSES.has(reviewStatus)) {
      throw Object.assign(new Error('Invalid reviewStatus'), { statusCode: 400 });
    }

    const output = this.getOutput(workspaceId, outputId);
    if (!output) {
      throw Object.assign(new Error('Output not found'), { statusCode: 404 });
    }

    output.reviewStatus = reviewStatus;
    output.reviewedAt = new Date().toISOString();
    this.insertOutput(workspaceId, output);
    this.insertAuditLog(workspaceId, auditEntry(
      'assistant.output_review_updated',
      `${output.label || 'Assistant output'} marked ${reviewStatus}`
    ));
    return output;
  }

  async createRecord(workspaceId, collection, record) {
    assertCollection(collection);
    this.ensureWorkspace(workspaceId);
    const now = new Date().toISOString();
    const saved = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...sanitizeRecord(collection, record)
    };
    this.insertRecord(workspaceId, collection, saved);
    this.insertAuditLog(workspaceId, auditEntry(`${collection}.created`, `${collection} record created`));
    return saved;
  }

  async updateRecord(workspaceId, collection, recordId, record) {
    assertCollection(collection);
    const existing = this.getRecord(workspaceId, collection, recordId);
    if (!existing) {
      throw Object.assign(new Error('Record not found'), { statusCode: 404 });
    }

    const updated = {
      ...existing,
      ...sanitizeRecord(collection, record),
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.insertRecord(workspaceId, collection, updated);
    this.insertAuditLog(workspaceId, auditEntry(`${collection}.updated`, `${collection} record updated`));
    return updated;
  }

  async deleteRecord(workspaceId, collection, recordId) {
    assertCollection(collection);
    const existing = this.getRecord(workspaceId, collection, recordId);
    if (!existing) {
      throw Object.assign(new Error('Record not found'), { statusCode: 404 });
    }

    this.db.prepare(`DELETE FROM ${COLLECTION_TABLES[collection]} WHERE workspace_id = ? AND id = ?`)
      .run(workspaceId, recordId);
    this.insertAuditLog(workspaceId, auditEntry(`${collection}.deleted`, `${collection} record deleted`));
    return existing;
  }

  close() {
    this.db.close();
  }

  ensureWorkspace(workspaceId) {
    this.db.prepare(`
      INSERT OR IGNORE INTO workspaces (id, created_at)
      VALUES (?, ?)
    `).run(workspaceId, new Date().toISOString());
  }

  readProfile(workspaceId) {
    const row = this.db.prepare('SELECT data FROM profiles WHERE workspace_id = ?').get(workspaceId);
    return row ? JSON.parse(row.data) : null;
  }

  readOutputs(workspaceId) {
    return this.db.prepare('SELECT data FROM assistant_outputs WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(workspaceId)
      .map((row) => JSON.parse(row.data));
  }

  readRecords(workspaceId, collection) {
    return this.db.prepare(`SELECT data FROM ${COLLECTION_TABLES[collection]} WHERE workspace_id = ? ORDER BY created_at DESC`)
      .all(workspaceId)
      .map((row) => JSON.parse(row.data));
  }

  readAuditLog(workspaceId) {
    return this.db.prepare('SELECT data FROM audit_logs WHERE workspace_id = ? ORDER BY created_at ASC')
      .all(workspaceId)
      .map((row) => JSON.parse(row.data));
  }

  insertOutput(workspaceId, output) {
    this.ensureWorkspace(workspaceId);
    this.db.prepare(`
      INSERT INTO assistant_outputs (id, workspace_id, action, label, audit_summary, review_status, reviewed_at, created_at, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        action = excluded.action,
        label = excluded.label,
        audit_summary = excluded.audit_summary,
        review_status = excluded.review_status,
        reviewed_at = excluded.reviewed_at,
        data = excluded.data
    `).run(
      output.id,
      workspaceId,
      output.action || '',
      output.label || '',
      output.auditSummary || '',
      output.reviewStatus || 'pending',
      output.reviewedAt || null,
      output.createdAt,
      JSON.stringify(output)
    );
  }

  insertRecord(workspaceId, collection, record) {
    this.ensureWorkspace(workspaceId);
    this.db.prepare(`
      INSERT INTO ${COLLECTION_TABLES[collection]} (id, workspace_id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(record.id, workspaceId, JSON.stringify(record), record.createdAt, record.updatedAt || null);
  }

  insertAuditLog(workspaceId, entry) {
    this.ensureWorkspace(workspaceId);
    this.db.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, workspace_id, type, summary, created_at, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entry.id, workspaceId, entry.type, entry.summary, entry.createdAt, JSON.stringify(entry));
  }

  getOutput(workspaceId, outputId) {
    const row = this.db.prepare('SELECT data FROM assistant_outputs WHERE workspace_id = ? AND id = ?')
      .get(workspaceId, outputId);
    return row ? JSON.parse(row.data) : null;
  }

  getRecord(workspaceId, collection, recordId) {
    const row = this.db.prepare(`SELECT data FROM ${COLLECTION_TABLES[collection]} WHERE workspace_id = ? AND id = ?`)
      .get(workspaceId, recordId);
    return row ? JSON.parse(row.data) : null;
  }

  capturePlaceholders(workspaceId, record) {
    const createdAt = record.createdAt;
    if (record.action === 'create_sop') {
      this.insertRecord(workspaceId, 'sops', {
        id: crypto.randomUUID(),
        sourceOutputId: record.id,
        title: record.label,
        status: 'draft',
        createdAt
      });
    }

    if (record.action === 'process_audit' || record.action === 'automation_assessment') {
      this.insertRecord(workspaceId, 'workflows', {
        id: crypto.randomUUID(),
        sourceOutputId: record.id,
        title: record.label,
        type: record.action,
        status: 'review_needed',
        createdAt
      });
    }

    if (record.action === 'daily_review' || record.action === 'weekly_review') {
      this.insertRecord(workspaceId, 'tasks', {
        id: crypto.randomUUID(),
        sourceOutputId: record.id,
        title: `${record.label} follow-up`,
        status: 'open',
        createdAt
      });
    }

    this.insertRecord(workspaceId, 'kpiHistory', {
      id: crypto.randomUUID(),
      sourceOutputId: record.id,
      title: `${record.label} KPI review`,
      action: record.action,
      status: 'review_needed',
      createdAt
    });
  }
}
