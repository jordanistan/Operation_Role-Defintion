# Architecture

## Current Decision

The MVP will use a dependency-free Node.js application with a browser UI, local JSON storage, and deterministic assistant workflows. This is intentionally small so the team can validate the operating model before adding databases, authentication providers, or third-party integrations.

Generated assistant outputs include owner review status. New outputs default to `pending`; users can mark them as `approved`, `rejected`, or `needs_changes` through a workspace-scoped API.

Workspace records for tasks, SOPs, workflows, and KPI history are managed through validated CRUD APIs. These records remain local JSON data during the MVP and are scoped by workspace ID.

The next storage target is SQLite, documented in `STORAGE_DECISION.md`. Hosted database selection is deferred until authentication and workspace roles are implemented.

## Components

- `public/`: static UI for business intake, assistant actions, generated outputs, history, and owner review status.
- `src/server.js`: HTTP server, API routing, access-key enforcement, workspace validation, request validation, and static file serving.
- `src/operations-agent.js`: assistant behavior, response templates, KPI guidance, and workflow generation.
- `src/store.js`: JSON persistence layer.
- `data/`: local runtime data. This directory should not store real client secrets.
- `tests/`: Node test runner tests for assistant behavior, validation, and persistence.

## Data Flow

1. User enters business context or asks for an operations output in the browser.
2. Browser sends JSON to the local API with an `X-Access-Key` header and workspace ID.
3. API validates the access key, workspace ID, and input payload.
4. API calls the operations agent module.
5. Agent returns a structured response with situation, risk/opportunity, recommendation, next actions, and documentation impact.
6. API stores workspace-scoped profile, generated outputs, review status, task records, SOP records, workflow records, KPI history records, and audit-log records.
7. Browser renders the result and recent output history for human review.
8. User updates review status for generated outputs; API validates the workspace, output, allowed status, and access key before recording an audit-log entry.
9. User manages operational records; API validates collection name, record ID, payload fields, workspace ID, and access key before changing local storage.

## Integration Boundaries

QuickBooks, CRM, project management, spreadsheet, and automation integrations are deferred. The first build may include interface stubs only. Real integrations require documented OAuth scopes, credential storage, consent language, logging, rollback behavior, and tests.

## Authentication Boundary

The current app uses a local `ACCESS_KEY` only. Production must replace this with managed authentication, secure sessions, server-side workspace membership, and role-based authorization as described in `AUTHENTICATION_DESIGN.md`.

## Security Impact

The MVP does not require external services. It requires a local `ACCESS_KEY`, binds to `127.0.0.1` by default, validates workspace IDs, validates JSON payload sizes, rejects invalid actions, avoids logging sensitive request bodies, and clearly marks generated recommendations as requiring human review. Access-key auth is not production authentication; production still requires user accounts, passwordless or SSO login, role-based access, and encrypted storage.
