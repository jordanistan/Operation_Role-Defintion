# Storage Decision

## Status

Decision implemented for local MVP use. JSON remains the default store during transition, and SQLite is available behind the same storage contract.

## Default Store Decision

Keep JSON as the default store for the immediate client-demo phase. SQLite is available with `STORE_TYPE=sqlite`, but should not become the default until the team accepts the risk of Node's experimental `node:sqlite` runtime or selects a stable SQLite dependency.

Reason:

- JSON has been stable for the current dependency-free MVP.
- SQLite support works in tests but uses an experimental Node API in this environment.
- Keeping JSON as default avoids surprising data-location changes during early client validation.
- SQLite remains available for local testing and migration validation.

## Decision

Move from local JSON storage to SQLite for the next implementation phase. Defer hosted database selection until authentication, workspace roles, and the core data model are stable.

## Why SQLite Next

SQLite is the right next step for this MVP because it improves reliability without forcing cloud infrastructure too early.

Benefits:

- Structured tables for workspaces, outputs, tasks, SOPs, workflows, KPI entries, and audit logs.
- Transaction support for multi-record updates.
- Easier querying and filtering than JSON files.
- Simple local backups as a single database file.
- Lower operational complexity while client workflows are still evolving.

## Why Not Hosted Database Yet

A hosted database will be required for production multi-user use, but choosing it now would add deployment, network, credential, migration, and access-control decisions before the product workflow is proven.

Revisit hosted storage after:

- Production authentication provider is selected.
- Workspace membership and role model are implemented.
- Client workflow and record types stabilize.
- Backup, deletion, and export requirements are clearer.

## Proposed SQLite Schema

Initial tables:

- `workspaces`: business workspace metadata.
- `profiles`: business intake profile by workspace.
- `assistant_outputs`: generated outputs and review status.
- `tasks`: task records.
- `sops`: SOP records.
- `workflows`: workflow records.
- `kpi_entries`: KPI history records.
- `audit_logs`: user, workspace, action, summary, and timestamp.

Future production tables:

- `users`
- `workspace_memberships`
- `integration_connections`
- `integration_tokens`

## Migration Requirements

Remaining migration work:

1. Document backup and restore commands.
2. Decide when to make SQLite the default store.
3. Add production-grade migration handling if hosted storage is selected later.

Current status: `npm run migrate:sqlite` imports the JSON source into SQLite when `data/operations-assistant.json` or `DATA_FILE` exists. The import does not run automatically at app startup.

Current status: storage contract version `1.0.0` exists in `src/storage-contract.js`; `SQLiteStore` exists in `src/sqlite-store.js`; and `npm run migrate:sqlite` initializes the local SQLite schema. JSON remains the default store. Use `STORE_TYPE=sqlite` to run the app against SQLite for new local data.

Important runtime note: this implementation uses Node's built-in `node:sqlite`, which is currently experimental in this environment.

## Security Impact

SQLite does not solve production access control by itself. The database file must be protected by filesystem permissions locally. Production still requires authenticated users, server-side authorization, encrypted secrets, backups, and deployment hardening.
