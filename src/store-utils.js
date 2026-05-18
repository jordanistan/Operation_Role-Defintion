export const DEFAULT_STATE = {
  workspaces: {}
};

export const DEFAULT_WORKSPACE = {
  profile: null,
  outputs: [],
  tasks: [],
  sops: [],
  workflows: [],
  kpiHistory: [],
  auditLog: []
};

export const REVIEW_STATUSES = new Set(['pending', 'approved', 'rejected', 'needs_changes']);
export const COLLECTIONS = new Set(['tasks', 'sops', 'workflows', 'kpiHistory']);

export function allowedCollections() {
  return Array.from(COLLECTIONS);
}

export function assertCollection(collection) {
  if (!COLLECTIONS.has(collection)) {
    throw Object.assign(new Error('Invalid collection'), { statusCode: 400 });
  }
}

export function sanitizeRecord(collection, record = {}) {
  const base = {
    title: cleanString(record.title, 160),
    status: cleanString(record.status, 60) || defaultStatus(collection),
    notes: cleanString(record.notes, 2000),
    owner: cleanString(record.owner, 120),
    dueDate: cleanString(record.dueDate, 40)
  };

  if (!base.title) {
    throw Object.assign(new Error('title is required'), { statusCode: 400 });
  }

  if (collection === 'kpiHistory') {
    return {
      ...base,
      metric: cleanString(record.metric, 160) || base.title,
      value: cleanString(record.value, 120),
      period: cleanString(record.period, 80)
    };
  }

  if (collection === 'workflows') {
    return {
      ...base,
      type: cleanString(record.type, 80) || 'manual'
    };
  }

  return base;
}

export function defaultStatus(collection) {
  if (collection === 'sops') return 'draft';
  if (collection === 'workflows' || collection === 'kpiHistory') return 'review_needed';
  return 'open';
}

export function auditEntry(type, summary) {
  return {
    id: crypto.randomUUID(),
    type,
    summary,
    createdAt: new Date().toISOString()
  };
}

export function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
