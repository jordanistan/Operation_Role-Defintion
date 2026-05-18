import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleRequest } from '../src/server.js';
import { JsonStore } from '../src/store.js';

test('API rejects missing access key', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'GET', '/api/state?workspaceId=demo-client');
    assert.equal(response.statusCode, 401);
  } finally {
    await context.close();
  }
});

test('API rejects invalid content type', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'POST', '/api/profile', {
      headers: { 'x-access-key': 'test-key' },
      body: 'not-json'
    });
    assert.equal(response.statusCode, 415);
  } finally {
    await context.close();
  }
});

test('API rejects invalid JSON', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'POST', '/api/profile', {
      headers: {
        'content-type': 'application/json',
        'x-access-key': 'test-key'
      },
      body: '{'
    });
    assert.equal(response.statusCode, 400);
  } finally {
    await context.close();
  }
});

test('API rejects invalid workspace IDs', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'POST', '/api/profile', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: '../bad',
        businessName: 'Stem Vase',
        businessType: 'floral studio',
        teamSize: 'owner + 3'
      })
    });
    assert.equal(response.statusCode, 400);
  } finally {
    await context.close();
  }
});

test('API saves profile and generates workspace-scoped output', async () => {
  const context = await testContext();
  try {
    const profileResponse = await apiRequest(context, 'POST', '/api/profile', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        businessName: 'Stem Vase',
        businessType: 'floral studio',
        teamSize: 'owner + 3',
        painPoints: ['late fulfillment']
      })
    });
    assert.equal(profileResponse.statusCode, 200);

    const assistantResponse = await apiRequest(context, 'POST', '/api/assistant', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        action: 'daily_review',
        context: 'Busy day.'
      })
    });
    assert.equal(assistantResponse.statusCode, 200);

    const stateResponse = await apiRequest(context, 'GET', '/api/state?workspaceId=demo-client', {
      headers: { 'x-access-key': 'test-key' }
    });
    assert.equal(stateResponse.json.profile.businessName, 'Stem Vase');
    assert.equal(stateResponse.json.outputs.length, 1);
    assert.equal(stateResponse.json.outputs[0].reviewStatus, 'pending');
    assert.equal(stateResponse.json.tasks.length, 1);
  } finally {
    await context.close();
  }
});

test('API updates output review status', async () => {
  const context = await testContext();
  try {
    const assistantResponse = await apiRequest(context, 'POST', '/api/assistant', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        action: 'daily_review',
        context: 'Busy day.'
      })
    });

    const outputId = assistantResponse.json.output.id;
    const reviewResponse = await apiRequest(context, 'POST', '/api/output-review', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        outputId,
        reviewStatus: 'approved'
      })
    });

    assert.equal(reviewResponse.statusCode, 200);
    assert.equal(reviewResponse.json.output.reviewStatus, 'approved');

    const stateResponse = await apiRequest(context, 'GET', '/api/state?workspaceId=demo-client', {
      headers: { 'x-access-key': 'test-key' }
    });
    assert.equal(stateResponse.json.outputs[0].reviewStatus, 'approved');
    assert.equal(stateResponse.json.auditLog.at(-1).type, 'assistant.output_review_updated');
  } finally {
    await context.close();
  }
});

test('API rejects invalid output review updates', async () => {
  const context = await testContext();
  try {
    const invalidStatus = await apiRequest(context, 'POST', '/api/output-review', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        outputId: '1234567890',
        reviewStatus: 'done'
      })
    });

    assert.equal(invalidStatus.statusCode, 400);
    assert.equal(invalidStatus.json.error, 'Invalid reviewStatus');

    const missingOutput = await apiRequest(context, 'POST', '/api/output-review', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        outputId: '1234567890',
        reviewStatus: 'approved'
      })
    });

    assert.equal(missingOutput.statusCode, 404);
    assert.equal(missingOutput.json.error, 'Output not found');
  } finally {
    await context.close();
  }
});

test('API creates, updates, and deletes workspace records', async () => {
  const context = await testContext();
  try {
    const createResponse = await apiRequest(context, 'POST', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'tasks',
        record: {
          title: 'Call vendor',
          owner: 'Jordan'
        }
      })
    });

    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.json.record.status, 'open');

    const recordId = createResponse.json.record.id;
    const updateResponse = await apiRequest(context, 'PUT', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'tasks',
        recordId,
        record: {
          title: 'Call vendor today',
          status: 'done'
        }
      })
    });

    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateResponse.json.record.title, 'Call vendor today');
    assert.equal(updateResponse.json.record.status, 'done');

    const deleteResponse = await apiRequest(context, 'DELETE', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'tasks',
        recordId
      })
    });

    assert.equal(deleteResponse.statusCode, 200);

    const stateResponse = await apiRequest(context, 'GET', '/api/state?workspaceId=demo-client', {
      headers: { 'x-access-key': 'test-key' }
    });
    assert.equal(stateResponse.json.tasks.length, 0);
    assert.equal(stateResponse.json.auditLog.at(-1).type, 'tasks.deleted');
  } finally {
    await context.close();
  }
});

test('API rejects invalid record CRUD requests', async () => {
  const context = await testContext();
  try {
    const invalidCollection = await apiRequest(context, 'POST', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'secrets',
        record: { title: 'Bad' }
      })
    });

    assert.equal(invalidCollection.statusCode, 400);
    assert.equal(invalidCollection.json.error, 'Invalid collection');

    const missingTitle = await apiRequest(context, 'POST', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'tasks',
        record: { title: '' }
      })
    });

    assert.equal(missingTitle.statusCode, 400);
    assert.equal(missingTitle.json.error, 'title is required');

    const invalidRecordId = await apiRequest(context, 'PUT', '/api/records', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        collection: 'tasks',
        recordId: '../bad',
        record: { title: 'Bad' }
      })
    });

    assert.equal(invalidRecordId.statusCode, 400);
    assert.equal(invalidRecordId.json.error, 'Invalid recordId');
  } finally {
    await context.close();
  }
});

test('API rejects unsupported assistant actions', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'POST', '/api/assistant', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        action: 'delete_everything'
      })
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json.error, 'Unsupported assistant action');
  } finally {
    await context.close();
  }
});

test('API rejects oversized JSON bodies', async () => {
  const context = await testContext();
  try {
    const response = await apiRequest(context, 'POST', '/api/profile', {
      headers: jsonHeaders(),
      body: JSON.stringify({
        workspaceId: 'demo-client',
        businessName: 'x'.repeat(70_000),
        businessType: 'floral studio',
        teamSize: 'owner + 3'
      })
    });
    assert.equal(response.statusCode, 413);
  } finally {
    await context.close();
  }
});

async function testContext() {
  const dir = await mkdtemp(join(tmpdir(), 'ops-api-'));
  return {
    accessKey: 'test-key',
    store: new JsonStore(join(dir, 'state.json')),
    async close() {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

async function apiRequest(context, method, url, options = {}) {
  const body = options.body || '';
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost',
    ...(options.headers || {})
  };

  const res = mockResponse();
  await handleRequest(req, res, context);
  return res.result();
}

function mockResponse() {
  const chunks = [];
  let statusCode = 200;

  return {
    writeHead(status, headers) {
      statusCode = status;
      this.headers = headers;
    },
    end(chunk = '') {
      if (chunk) chunks.push(Buffer.from(chunk));
    },
    result() {
      const body = Buffer.concat(chunks).toString('utf8');
      return {
        statusCode,
        body,
        json: body ? JSON.parse(body) : null
      };
    }
  };
}

function jsonHeaders() {
  return {
    'content-type': 'application/json',
    'x-access-key': 'test-key'
  };
}
