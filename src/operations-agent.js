const ESCALATION_TOPICS = [
  'legal',
  'lawsuit',
  'tax',
  'payroll',
  'hr compliance',
  'termination',
  'insurance',
  'safety',
  'loan',
  'bankruptcy'
];

const ACTIONS = new Set([
  'daily_review',
  'weekly_review',
  'create_sop',
  'process_audit',
  'automation_assessment'
]);

export function supportedActions() {
  return Array.from(ACTIONS);
}

export function validateBusinessProfile(profile = {}) {
  const errors = [];

  if (!stringValue(profile.businessName)) errors.push('businessName is required');
  if (!stringValue(profile.businessType)) errors.push('businessType is required');
  if (!stringValue(profile.teamSize)) errors.push('teamSize is required');

  return errors;
}

export function createAgentResponse({ action, profile = {}, context = '' }) {
  if (!ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  const escalation = detectEscalation(context);
  const businessName = profile.businessName || 'the business';
  const tools = arrayValue(profile.tools);
  const painPoints = arrayValue(profile.painPoints);
  const kpis = normalizeKpis(profile.kpis);

  const response = {
    action,
    label: labelForAction(action),
    humanReviewRequired: true,
    escalationRequired: escalation.required,
    escalationTopics: escalation.topics,
    sections: buildSections(action, {
      businessName,
      businessType: profile.businessType || 'small business',
      teamSize: profile.teamSize || 'unknown team size',
      tools,
      painPoints,
      kpis,
      context
    }),
    auditSummary: `${labelForAction(action)} generated for ${businessName}. Human review required.`
  };

  if (escalation.required) {
    response.sections.riskOrOpportunity = [
      ...response.sections.riskOrOpportunity,
      'This request may involve regulated or high-risk advice. Prepare context for a qualified professional before taking final action.'
    ];
  }

  return response;
}

function buildSections(action, data) {
  const shared = {
    situation: buildSituation(data),
    documentationOrSopImpact: [
      'Record the current process before changing it.',
      'Update the relevant SOP, checklist, or workflow notes after owner review.'
    ]
  };

  const builders = {
    daily_review: () => buildDailyReview(shared, data),
    weekly_review: () => ({
      ...shared,
      riskOrOpportunity: [
        'Weekly review creates visibility into repeated bottlenecks instead of treating every issue as a one-off problem.'
      ],
      recommendation: [
        'Summarize completed work, unresolved blockers, KPI movement, vendor issues, staffing capacity, and process improvements for the next week.'
      ],
      nextActions: [
        'Select the top three operational priorities for next week.',
        'Identify one workflow to document or improve.',
        'Review KPI trends and assign follow-up owners.'
      ]
    }),
    create_sop: () => ({
      ...shared,
      riskOrOpportunity: [
        'Repeated work without an SOP increases training time, owner dependency, and execution errors.'
      ],
      recommendation: [
        'Create a simple SOP with purpose, trigger, inputs, steps, owner, quality checks, exceptions, and escalation path.'
      ],
      nextActions: [
        'Choose the most repeated workflow.',
        'Interview the person who performs it most often.',
        'Draft the SOP, test it once, then revise before team rollout.'
      ]
    }),
    process_audit: () => ({
      ...shared,
      riskOrOpportunity: [
        priorityPainPoint(data.painPoints),
        'Auditing the current process will expose delays, duplicated work, missing owners, and avoidable handoff failures.'
      ],
      recommendation: [
        'Map the workflow from trigger to completion, then identify bottlenecks, rework loops, decision points, and automation candidates.'
      ],
      nextActions: [
        'Document each step in the current process.',
        'Mark delays, handoffs, unclear owners, and manual data entry.',
        'Recommend one low-risk improvement before considering automation.'
      ]
    }),
    automation_assessment: () => ({
      ...shared,
      riskOrOpportunity: [
        'Automation can reduce manual work, but automating an unstable process can make errors faster and harder to see.'
      ],
      recommendation: [
        'Confirm the manual workflow is documented and stable before recommending Zapier, Make, CRM automation, accounting sync, or project-management templates.'
      ],
      nextActions: [
        'Define the trigger, inputs, output, owner, exception path, and rollback process.',
        'Test automation with sample data before connecting live systems.',
        'Document access scopes and failure alerts.'
      ]
    })
  };

  return builders[action]();
}

function buildDailyReview(shared, data) {
  const summaryRequested = /summary|summarize|what needs to be done|what needs done|today/i.test(data.context);
  const missing = missingDailyReviewInputs(data);
  const focus = data.painPoints.length
    ? `Start with ${data.painPoints.slice(0, 2).join(' and ')} because those are the stated operating gaps.`
    : 'Start by identifying today\'s blocked work, customer commitments, staffing gaps, and supply risks.';

  return {
    ...shared,
    situation: [
      ...shared.situation,
      summaryRequested
        ? 'Requested output: a practical summary of what needs to be done today.'
        : 'Requested output: daily operations review.'
    ],
    riskOrOpportunity: [
      focus,
      'If today\'s priorities are not assigned to owners, inventory gaps, customer delays, and invoice follow-ups can carry into tomorrow.',
      missing.length
        ? `Missing details to confirm: ${missing.join(', ')}.`
        : 'Enough basic context was provided to create an initial action list.'
    ],
    recommendation: [
      'Use this as today\'s operating summary: confirm customer commitments, check inventory gaps, assign blocked work, review cash or invoice follow-ups, and document any process misses.',
      `Work from ${formatList(data.tools, 'the current task list, spreadsheet, inbox, and accounting tool')} so the review matches the systems the team already uses.`,
      `Track progress against ${formatList(data.kpis, 'completion time, manual tasks reduced, cost savings, and SOP adoption')}.`
    ],
    nextActions: [
      'List every customer order, appointment, or service commitment due today and mark each as on track, at risk, or blocked.',
      'Check the stated inventory gaps and decide what must be reordered, substituted, or escalated today.',
      'Assign one owner and due time for each blocked task before work continues.',
      'Review unpaid invoices, payment follow-ups, or cash-impacting issues that need action today.',
      'End the day by saving any repeated issue as a task, SOP update, workflow issue, or KPI note.'
    ],
    documentationOrSopImpact: [
      'Create or update a daily opening checklist if these same review items repeat.',
      'Log inventory gaps as operational records so they can be reviewed weekly.',
      'If the same blocker appears twice, draft an SOP or process audit instead of handling it informally again.'
    ]
  };
}

function detectEscalation(text = '') {
  const normalized = text.toLowerCase();
  const topics = ESCALATION_TOPICS.filter((topic) => normalized.includes(topic));
  return { required: topics.length > 0, topics };
}

function normalizeKpis(kpis) {
  const values = arrayValue(kpis);
  return values.length ? values.slice(0, 4) : [
    'fulfillment or service completion time',
    'manual tasks reduced',
    'cost savings',
    'SOP adoption rate'
  ];
}

function buildSituation(data) {
  const items = [
    `${data.businessName} profile: ${data.businessType}; team size: ${data.teamSize}.`
  ];

  if (data.tools.length) items.push(`Current tools mentioned: ${data.tools.join(', ')}.`);
  if (data.painPoints.length) items.push(`Known pain points: ${data.painPoints.join(', ')}.`);
  if (data.context) items.push(`User request/context: ${data.context}`);
  if (!data.context) items.push('No additional operating context was provided.');

  return items;
}

function missingDailyReviewInputs(data) {
  const missing = [];
  const context = data.context.toLowerCase();

  if (!/(order|appointment|customer|client|delivery|fulfillment|service)/i.test(context)) {
    missing.push('today\'s customer commitments');
  }
  if (!/(staff|team|schedule|capacity|coverage)/i.test(context)) {
    missing.push('staff coverage');
  }
  if (!/(invoice|cash|payment|quickbooks|ar|receivable)/i.test(context) && !data.tools.some((tool) => /quickbooks|xero|wave/i.test(tool))) {
    missing.push('cash or invoice status');
  }
  if (!data.painPoints.length) missing.push('top operating bottleneck');

  return missing;
}

function labelForAction(action) {
  return action.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function priorityPainPoint(painPoints) {
  return painPoints.length
    ? `Primary pain point to address: ${painPoints[0]}.`
    : 'No pain point was provided, so start by identifying the highest-friction workflow.';
}

function arrayValue(value) {
  if (Array.isArray(value)) return value.filter(stringValue).map((item) => item.trim());
  if (stringValue(value)) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function formatList(values, fallback) {
  return values.length ? values.join(', ') : fallback;
}

function stringValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
