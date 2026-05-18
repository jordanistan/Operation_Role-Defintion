const settingsForm = document.querySelector('#settings-form');
const profileForm = document.querySelector('#profile-form');
const assistantForm = document.querySelector('#assistant-form');
const recordForm = document.querySelector('#record-form');
const recordFilter = document.querySelector('#record-filter');
const recordCounts = document.querySelector('#record-counts');
const output = document.querySelector('#output');
const historyList = document.querySelector('#history-list');
const recordsList = document.querySelector('#records-list');

const REVIEW_OPTIONS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['needs_changes', 'Needs changes']
];

const COLLECTION_LABELS = {
  tasks: 'Tasks',
  sops: 'SOPs',
  workflows: 'Workflows',
  kpiHistory: 'KPI History'
};

const settings = {
  accessKey: sessionStorage.getItem('ops_access_key') || '',
  workspaceId: sessionStorage.getItem('ops_workspace_id') || 'demo-client',
  recordFilter: sessionStorage.getItem('ops_record_filter') || 'all'
};

settingsForm.accessKey.value = settings.accessKey;
settingsForm.workspaceId.value = settings.workspaceId;
recordFilter.value = settings.recordFilter;

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(settingsForm);
  settings.accessKey = String(form.get('accessKey') || '').trim();
  settings.workspaceId = String(form.get('workspaceId') || '').trim();
  sessionStorage.setItem('ops_access_key', settings.accessKey);
  sessionStorage.setItem('ops_workspace_id', settings.workspaceId);
  await loadWorkspace();
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const profile = { ...formProfile(profileForm), workspaceId: settings.workspaceId };
  const result = await postJson('/api/profile', profile);
  if (result.error) return renderError(result);
  output.innerHTML = '<p class="notice">Business profile saved locally.</p>';
  await loadWorkspace();
});

assistantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(assistantForm);
  const result = await postJson('/api/assistant', {
    action: form.get('action'),
    context: form.get('context'),
    workspaceId: settings.workspaceId
  });

  if (result.error) return renderError(result);
  renderOutput(result.output);
  await loadWorkspace();
});

recordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(recordForm);
  const result = await postJson('/api/records', {
    workspaceId: settings.workspaceId,
    collection: form.get('collection'),
    record: recordFromForm(form)
  });

  if (result.error) return renderError(result);
  recordForm.reset();
  output.innerHTML = '<p class="notice">Record added.</p>';
  await loadWorkspace();
});

recordForm.collection.addEventListener('change', updateCreateFieldVisibility);

recordFilter.addEventListener('change', async () => {
  settings.recordFilter = recordFilter.value;
  sessionStorage.setItem('ops_record_filter', settings.recordFilter);
  await loadWorkspace();
});

if (settings.accessKey) {
  loadWorkspace();
}

updateCreateFieldVisibility();

function formProfile(form) {
  const data = new FormData(form);
  return {
    businessName: data.get('businessName'),
    businessType: data.get('businessType'),
    teamSize: data.get('teamSize'),
    tools: splitList(data.get('tools')),
    painPoints: splitList(data.get('painPoints')),
    kpis: splitList(data.get('kpis'))
  };
}

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function recordFromForm(form) {
  return {
    title: form.get('title'),
    status: form.get('status'),
    owner: form.get('owner'),
    dueDate: form.get('dueDate'),
    notes: form.get('notes'),
    type: form.get('type'),
    metric: form.get('metric'),
    value: form.get('value'),
    period: form.get('period')
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': settings.accessKey
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function updateReviewStatus(outputId, reviewStatus) {
  const result = await postJson('/api/output-review', {
    workspaceId: settings.workspaceId,
    outputId,
    reviewStatus
  });

  if (result.error) return renderError(result);
  output.innerHTML = `<p class="notice">Review status updated to ${escapeHtml(formatStatus(reviewStatus))}.</p>`;
  await loadWorkspace();
}

async function loadWorkspace() {
  if (!settings.accessKey || !settings.workspaceId) return;
  const response = await fetch(`/api/state?workspaceId=${encodeURIComponent(settings.workspaceId)}`, {
    headers: { 'X-Access-Key': settings.accessKey }
  });
  const state = await response.json();
  if (state.error) return renderError(state);

  if (state.profile) {
    profileForm.businessName.value = state.profile.businessName || '';
    profileForm.businessType.value = state.profile.businessType || '';
    profileForm.teamSize.value = state.profile.teamSize || '';
    profileForm.tools.value = (state.profile.tools || []).join(', ');
    profileForm.painPoints.value = (state.profile.painPoints || []).join(', ');
    profileForm.kpis.value = (state.profile.kpis || []).join(', ');
  }

  renderHistory(state.outputs || []);
  renderRecords(state);
}

function renderOutput(record) {
  const sections = record.sections;
  output.innerHTML = `
    <h2>${escapeHtml(record.label)}</h2>
    <p class="notice">AI-generated recommendation. Human review required.</p>
    ${record.escalationRequired ? '<p class="notice">High-risk topic detected. Escalate to a qualified professional before final action.</p>' : ''}
    ${renderSection('Situation', sections.situation)}
    ${renderSection('Risk or Opportunity', sections.riskOrOpportunity)}
    ${renderSection('Recommendation', sections.recommendation)}
    ${renderSection('Next Actions', sections.nextActions)}
    ${renderSection('Documentation or SOP Impact', sections.documentationOrSopImpact)}
  `;
}

function renderSection(title, items) {
  return `
    <div class="section">
      <h3>${title}</h3>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function renderError(result) {
  const details = Array.isArray(result.details) ? ` ${result.details.join(', ')}` : '';
  output.innerHTML = `<p class="notice">${escapeHtml(result.error || 'Something went wrong.')}${escapeHtml(details)}</p>`;
}

function renderHistory(outputs) {
  if (!outputs.length) {
    historyList.innerHTML = '<p class="lede">No outputs generated for this workspace yet.</p>';
    return;
  }

  historyList.innerHTML = outputs.slice(0, 8).map((item) => `
    <div class="history-item">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(new Date(item.createdAt).toLocaleString())}</span>
      <label>
        Review status
        <select data-output-id="${escapeHtml(item.id)}">
          ${REVIEW_OPTIONS.map(([value, label]) => `
            <option value="${value}" ${value === item.reviewStatus ? 'selected' : ''}>${label}</option>
          `).join('')}
        </select>
      </label>
      <p>${escapeHtml(item.auditSummary)}</p>
    </div>
  `).join('');

  historyList.querySelectorAll('select[data-output-id]').forEach((select) => {
    select.addEventListener('change', () => updateReviewStatus(select.dataset.outputId, select.value));
  });
}

function renderRecords(state) {
  const collections = Object.keys(COLLECTION_LABELS);
  renderRecordCounts(state, collections);

  const visibleCollections = settings.recordFilter === 'all'
    ? collections
    : collections.filter((collection) => collection === settings.recordFilter);

  recordsList.innerHTML = visibleCollections.map((collection) => {
    const records = state[collection] || [];
    return `
      <section class="record-group">
        <h3>${COLLECTION_LABELS[collection]} <span>${records.length}</span></h3>
        ${records.length ? records.map((record) => renderRecord(collection, record)).join('') : '<p class="lede">No records yet.</p>'}
      </section>
    `;
  }).join('');

  recordsList.querySelectorAll('[data-record-action="save"]').forEach((button) => {
    button.addEventListener('click', () => saveRecord(button.closest('.record-item')));
  });

  recordsList.querySelectorAll('[data-record-action="delete"]').forEach((button) => {
    button.addEventListener('click', () => deleteRecord(button.closest('.record-item')));
  });
}

function renderRecord(collection, record) {
  const extraFields = renderExtraRecordFields(collection, record);
  return `
    <div class="record-item" data-collection="${escapeHtml(collection)}" data-record-id="${escapeHtml(record.id)}">
      <div class="record-summary">
        <strong>${escapeHtml(record.title || 'Untitled record')}</strong>
        <span>${escapeHtml(record.status || 'No status')}</span>
        <span>${escapeHtml(record.owner || 'No owner')}</span>
        <span>${escapeHtml(record.dueDate || 'No due date')}</span>
      </div>
      <div class="record-grid">
        <label>Title<input name="title" value="${escapeHtml(record.title || '')}"></label>
        <label>Status<input name="status" value="${escapeHtml(record.status || '')}"></label>
        <label>Owner<input name="owner" value="${escapeHtml(record.owner || '')}"></label>
        <label>Due date<input name="dueDate" value="${escapeHtml(record.dueDate || '')}"></label>
        ${extraFields}
        <label>Notes<input name="notes" value="${escapeHtml(record.notes || '')}"></label>
      </div>
      <div class="record-actions">
        <button type="button" data-record-action="save">Save</button>
        <button type="button" data-record-action="delete">Delete</button>
      </div>
    </div>
  `;
}

function renderExtraRecordFields(collection, record) {
  if (collection === 'workflows') {
    return `<label>Workflow type<input name="type" value="${escapeHtml(record.type || '')}"></label>`;
  }

  if (collection === 'kpiHistory') {
    return `
      <label>Metric<input name="metric" value="${escapeHtml(record.metric || '')}"></label>
      <label>Value<input name="value" value="${escapeHtml(record.value || '')}"></label>
      <label>Period<input name="period" value="${escapeHtml(record.period || '')}"></label>
    `;
  }

  return '';
}

function renderRecordCounts(state, collections) {
  recordCounts.innerHTML = collections.map((collection) => `
    <button type="button" data-filter="${escapeHtml(collection)}" class="${settings.recordFilter === collection ? 'active' : ''}">
      ${COLLECTION_LABELS[collection]}: ${(state[collection] || []).length}
    </button>
  `).join('');

  recordCounts.querySelectorAll('button[data-filter]').forEach((button) => {
    button.addEventListener('click', async () => {
      settings.recordFilter = button.dataset.filter;
      recordFilter.value = settings.recordFilter;
      sessionStorage.setItem('ops_record_filter', settings.recordFilter);
      await loadWorkspace();
    });
  });
}

async function saveRecord(element) {
  const result = await requestJson('/api/records', {
    method: 'PUT',
    payload: {
      workspaceId: settings.workspaceId,
      collection: element.dataset.collection,
      recordId: element.dataset.recordId,
      record: recordFromElement(element)
    }
  });

  if (result.error) return renderError(result);
  output.innerHTML = '<p class="notice">Record saved.</p>';
  await loadWorkspace();
}

async function deleteRecord(element) {
  const result = await requestJson('/api/records', {
    method: 'DELETE',
    payload: {
      workspaceId: settings.workspaceId,
      collection: element.dataset.collection,
      recordId: element.dataset.recordId
    }
  });

  if (result.error) return renderError(result);
  output.innerHTML = '<p class="notice">Record deleted.</p>';
  await loadWorkspace();
}

function recordFromElement(element) {
  return {
    title: element.querySelector('[name="title"]').value,
    status: element.querySelector('[name="status"]').value,
    owner: element.querySelector('[name="owner"]').value,
    dueDate: element.querySelector('[name="dueDate"]').value,
    notes: element.querySelector('[name="notes"]').value,
    type: element.querySelector('[name="type"]')?.value || '',
    metric: element.querySelector('[name="metric"]')?.value || '',
    value: element.querySelector('[name="value"]')?.value || '',
    period: element.querySelector('[name="period"]')?.value || ''
  };
}

function updateCreateFieldVisibility() {
  const collection = recordForm.collection.value;
  recordForm.querySelectorAll('.workflow-field').forEach((element) => {
    element.hidden = collection !== 'workflows';
  });
  recordForm.querySelectorAll('.kpi-field').forEach((element) => {
    element.hidden = collection !== 'kpiHistory';
  });
}

async function requestJson(url, { method, payload }) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': settings.accessKey
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function formatStatus(value) {
  const option = REVIEW_OPTIONS.find(([status]) => status === value);
  return option ? option[1] : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
