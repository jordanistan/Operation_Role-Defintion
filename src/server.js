import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAgentResponse, supportedActions, validateBusinessProfile } from './operations-agent.js';
import { allowedCollections } from './store.js';
import { createStoreFromEnv } from './store-factory.js';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC_DIR = join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 64 * 1024;

export function createApp({
  accessKey = process.env.ACCESS_KEY || '',
  store = createStoreFromEnv(ROOT)
} = {}) {
  return createServer((req, res) => handleRequest(req, res, { accessKey, store }));
}

export async function handleRequest(req, res, {
  accessKey = process.env.ACCESS_KEY || '',
  store = createStoreFromEnv(ROOT)
} = {}) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        authRequired: true,
        configured: Boolean(accessKey),
        actions: supportedActions(),
        collections: allowedCollections()
      });
    }

    if (!accessKey) {
      return sendJson(res, 503, { error: 'ACCESS_KEY is required to use the API' });
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      requireAccess(req, accessKey);
      const workspaceId = workspaceFromRequest(req, url, accessKey);
      return sendJson(res, 200, await store.readWorkspace(workspaceId));
    }

    if (req.method === 'POST' && url.pathname === '/api/profile') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      const errors = validateBusinessProfile(body);
      if (errors.length) return sendJson(res, 400, { error: 'Invalid business profile', details: errors });
      const state = await store.saveProfile(workspaceId, sanitizeProfile(body));
      return sendJson(res, 200, { profile: state.workspaces[workspaceId].profile, workspaceId });
    }

    if (req.method === 'POST' && url.pathname === '/api/assistant') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      if (!supportedActions().includes(body.action)) {
        return sendJson(res, 400, { error: 'Unsupported assistant action' });
      }
      const workspace = await store.readWorkspace(workspaceId);
      const profile = sanitizeProfile(body.profile || workspace.profile || {});
      const output = createAgentResponse({
        action: body.action,
        profile,
        context: typeof body.context === 'string' ? body.context.slice(0, 4000) : ''
      });
      const record = await store.saveOutput(workspaceId, output);
      return sendJson(res, 200, { output: record, workspaceId });
    }

    if (req.method === 'POST' && url.pathname === '/api/output-review') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      const outputId = validateId(body.outputId, 'outputId');
      const reviewStatus = validateReviewStatus(body.reviewStatus);
      const updated = await store.updateOutputReview(workspaceId, outputId, reviewStatus);
      return sendJson(res, 200, { output: updated, workspaceId });
    }

    if (req.method === 'POST' && url.pathname === '/api/records') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      const collection = validateCollection(body.collection);
      const record = await store.createRecord(workspaceId, collection, body.record || {});
      return sendJson(res, 201, { record, collection, workspaceId });
    }

    if (req.method === 'PUT' && url.pathname === '/api/records') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      const collection = validateCollection(body.collection);
      const recordId = validateRecordId(body.recordId);
      const record = await store.updateRecord(workspaceId, collection, recordId, body.record || {});
      return sendJson(res, 200, { record, collection, workspaceId });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/records') {
      requireAccess(req, accessKey);
      const body = await readJson(req);
      const workspaceId = validateWorkspaceId(body.workspaceId);
      const collection = validateCollection(body.collection);
      const recordId = validateRecordId(body.recordId);
      const record = await store.deleteRecord(workspaceId, collection, recordId);
      return sendJson(res, 200, { record, collection, workspaceId });
    }

    if (req.method === 'GET') {
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Internal server error' : error.message;
    if (status === 500) console.error(error);
    return sendJson(res, status, { error: message });
  }
}

const server = createApp();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => {
    console.log(`Operations Assistant MVP running at http://${HOST}:${PORT}`);
    if (!process.env.ACCESS_KEY) {
      console.warn('ACCESS_KEY is not set. API calls will return 503 until it is configured.');
    }
  });
}

export { server };

function requireAccess(req, accessKey) {
  if (req.headers['x-access-key'] !== accessKey) {
    throw httpError(401, 'Unauthorized');
  }
}

function workspaceFromRequest(req, url, accessKey) {
  requireAccess(req, accessKey);
  return validateWorkspaceId(url.searchParams.get('workspaceId'));
}

function validateWorkspaceId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,62}$/.test(value)) {
    throw httpError(400, 'Invalid workspaceId');
  }
  return value;
}

function validateId(value, fieldName) {
  if (typeof value !== 'string' || !/^[a-f0-9-]{10,80}$/i.test(value)) {
    throw httpError(400, `Invalid ${fieldName}`);
  }
  return value;
}

function validateReviewStatus(value) {
  const allowed = ['pending', 'approved', 'rejected', 'needs_changes'];
  if (!allowed.includes(value)) {
    throw httpError(400, 'Invalid reviewStatus');
  }
  return value;
}

function validateCollection(value) {
  if (!allowedCollections().includes(value)) {
    throw httpError(400, 'Invalid collection');
  }
  return value;
}

function validateRecordId(value) {
  return validateId(value, 'recordId');
}

async function readJson(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    throw httpError(415, 'Content-Type must be application/json');
  }

  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw httpError(413, 'Request body too large');
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw httpError(400, 'Invalid JSON');
  }
}

function sanitizeProfile(profile) {
  return {
    businessName: cleanString(profile.businessName, 120),
    businessType: cleanString(profile.businessType, 120),
    teamSize: cleanString(profile.teamSize, 60),
    tools: cleanArray(profile.tools, 12, 80),
    painPoints: cleanArray(profile.painPoints, 12, 140),
    kpis: cleanArray(profile.kpis, 4, 120)
  };
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanArray(value, maxItems, maxLength) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return source
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

async function serveStatic(pathname, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    return res.end(file);
  } catch {
    return sendJson(res, 404, { error: 'Not found' });
  }
}

function contentType(filePath) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8'
  };
  return types[extname(filePath)] || 'application/octet-stream';
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
