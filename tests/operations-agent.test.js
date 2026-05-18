import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentResponse, supportedActions, validateBusinessProfile } from '../src/operations-agent.js';

test('supportedActions includes required MVP workflows', () => {
  assert.deepEqual(supportedActions(), [
    'daily_review',
    'weekly_review',
    'create_sop',
    'process_audit',
    'automation_assessment'
  ]);
});

test('validateBusinessProfile requires core intake fields', () => {
  assert.deepEqual(validateBusinessProfile({}), [
    'businessName is required',
    'businessType is required',
    'teamSize is required'
  ]);
});

test('createAgentResponse returns structured daily review output', () => {
  const response = createAgentResponse({
    action: 'daily_review',
    profile: {
      businessName: 'Stem Vase',
      businessType: 'floral studio',
      teamSize: 'owner + 3',
      tools: ['QuickBooks', 'Google Sheets'],
      painPoints: ['late fulfillment'],
      kpis: ['fulfillment time']
    },
    context: 'Orders are late today.'
  });

  assert.equal(response.humanReviewRequired, true);
  assert.equal(response.escalationRequired, false);
  assert.equal(response.sections.situation[0], 'Stem Vase profile: floral studio; team size: owner + 3.');
  assert.match(response.sections.riskOrOpportunity[0], /late fulfillment/);
  assert.ok(response.sections.nextActions.length >= 3);
});

test('createAgentResponse gives useful daily summary with limited context', () => {
  const response = createAgentResponse({
    action: 'daily_review',
    profile: {
      businessName: 'stems vase studio',
      businessType: 'glass vase',
      teamSize: '4',
      tools: ['quickbooks'],
      painPoints: ['inventory gaps']
    },
    context: 'please give me a summary of what needs to be done'
  });

  assert.match(response.sections.situation.join(' '), /Requested output: a practical summary/);
  assert.match(response.sections.riskOrOpportunity.join(' '), /Missing details to confirm/);
  assert.match(response.sections.recommendation.join(' '), /today's operating summary/);
  assert.match(response.sections.nextActions.join(' '), /inventory gaps/);
  assert.match(response.sections.nextActions.join(' '), /customer order, appointment, or service commitment/);
  assert.doesNotMatch(response.sections.situation[0], /operating as a glass vase with 4/);
});

test('createAgentResponse flags high-risk escalation topics', () => {
  const response = createAgentResponse({
    action: 'weekly_review',
    profile: {
      businessName: 'Stem Vase',
      businessType: 'floral studio',
      teamSize: 'owner + 3'
    },
    context: 'Need payroll and tax decisions.'
  });

  assert.equal(response.escalationRequired, true);
  assert.deepEqual(response.escalationTopics, ['tax', 'payroll']);
  assert.match(response.sections.riskOrOpportunity.at(-1), /qualified professional/);
});

test('createAgentResponse rejects unsupported actions', () => {
  assert.throws(() => createAgentResponse({ action: 'delete_everything' }), /Unsupported action/);
});
