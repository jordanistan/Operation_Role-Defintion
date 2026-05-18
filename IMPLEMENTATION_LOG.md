# Implementation Log

## 2026-05-18: Owner Review Controls

## Documentation-First Status

This entry was created before implementation. The intended change is to add owner review controls for generated assistant outputs.

Status after implementation: completed.

## Intended Change

Add a workspace-scoped review status to each generated output. Users should be able to mark an output as `pending`, `approved`, `rejected`, or `needs_changes` from the browser UI.

## Reason

Generated operations recommendations should not silently become accepted work. The owner or operator needs an explicit review step so future workflows, SOPs, tasks, and KPI records can distinguish unreviewed AI output from approved business guidance.

## Expected Behavior

- New outputs default to `pending` review status.
- Recent output history shows the current review status.
- The UI allows updating review status for each recent output.
- The API validates workspace ID, output ID, access key, and allowed statuses.
- Status changes are recorded in the workspace audit log.

## Security and Operational Risk

Access-key protection remains required for review updates. Review status is not production authorization; it only records local owner review state. Invalid statuses, missing output IDs, and cross-workspace updates must be rejected.

## Verification Plan

- Add store tests for review status updates and audit logging.
- Add API tests for valid updates, invalid statuses, missing outputs, and auth enforcement.
- Run `npm test`.
- Start the app with `ACCESS_KEY` and manually test status changes in the browser.

## Implementation Result

- Added default `pending` review status to generated outputs.
- Added workspace-scoped review status updates with audit logging.
- Added `/api/output-review` for validated review status changes.
- Added browser review-status controls in recent output history.
- Added store and API tests for review status behavior.

## Verification Result

`npm test` passes.

## 2026-05-18: Lazy SQLite Runtime Loading

## Documentation-First Status

This entry was created before implementation. The intended change is to prevent JSON-mode app startup from showing Node's experimental SQLite warning.

## Observed Issue

Starting the app in default JSON mode still loaded `node:sqlite` because `SQLiteStore` imported it at module load time. This produced an experimental warning even when SQLite was not selected.

## Intended Change

Load `node:sqlite` only when `SQLiteStore` is constructed.

## Reason

The client-demo path uses JSON by default. It should not show SQLite warnings unless the user explicitly chooses SQLite with `STORE_TYPE=sqlite`.

## Expected Behavior

- JSON mode starts without importing `node:sqlite`.
- SQLite mode still works.
- Tests continue to pass.

## Verification Plan

- Update `src/sqlite-store.js`.
- Run `npm test`.
- Start the app in JSON mode on an available port.

## Implementation Result

- Moved `node:sqlite` loading inside the `SQLiteStore` constructor.
- JSON-mode startup no longer imports SQLite just because the factory module is loaded.

## Verification Result

`npm test` passes.

## 2026-05-18: Assistant Output Quality Fix

## Documentation-First Status

This entry was created before implementation. The intended change is to improve assistant output quality after manual testing showed the daily review was too generic and repeated weak profile fields awkwardly.

## Observed Issue

The daily review output did not adequately answer a summary request. It used generic recommendations and repeated profile values in a way that read poorly, for example treating a business type as the whole operating model.

## Intended Change

Improve `daily_review` generation so it:

- Responds directly when the user asks for a summary.
- Produces concrete sections for today's focus, risks, actions, and missing information.
- Uses profile fields carefully without overclaiming.
- Turns known pain points, tools, and KPIs into practical next steps.
- Calls out missing data instead of pretending to know operational details.

## Reason

The client-facing value depends on outputs feeling like a useful operations assistant, not a static template. Early manual testing should tighten behavior before more features are added.

## Expected Behavior

- Daily review should be more specific and useful even with limited context.
- The assistant should ask for missing details when needed.
- Existing API shape should remain unchanged.
- Tests should cover summary-style daily review behavior.

## Security and Operational Risk

This is behavior logic only. The assistant must still avoid regulated final advice and keep human review labels intact.

## Verification Plan

- Update assistant generation logic.
- Add tests for summary-style daily review output and profile wording.
- Run `npm test`.

## Implementation Result

- Reworked daily review generation to produce a practical operating summary.
- Improved profile wording so weak business-type fields are not echoed as awkward claims.
- Added missing-information prompts for customer commitments, staff coverage, cash/invoice status, and bottlenecks.
- Added behavior coverage for the manually observed summary case.

## Verification Result

`npm test` passes.

## 2026-05-18: Operational Records UX

## Documentation-First Status

This entry was created before implementation. The intended change is to improve the browser experience for managing tasks, SOPs, workflows, and KPI records.

## Intended Change

Update the operational records UI so users can:

- Filter records by type.
- See counts by record type.
- Use clearer type-specific fields for workflows and KPI entries.
- Scan record metadata without opening raw data.
- Continue creating, editing, and deleting records through existing APIs.

## Reason

The current record section works, but it is too generic for daily use. Owners need to quickly see what work exists, what type it is, who owns it, and what status it has.

## Expected Behavior

- Existing API behavior remains unchanged.
- The UI should render all four record types clearly.
- Filtering should happen in the browser only.
- Record save/delete behavior should continue to use authenticated API calls.
- Type-specific fields should be included in create/edit payloads where relevant.

## Security and Operational Risk

This is a UI-only workflow improvement. It must not relax access-key requirements or expose hidden data. The UI should continue escaping rendered values.

## Verification Plan

- Update browser HTML, CSS, and JS.
- Run `npm test`.
- Manually verify that the page can still load with existing API behavior.

## Implementation Result

- Added browser record filtering by type.
- Added record count buttons for tasks, SOPs, workflows, and KPI history.
- Added type-specific create/edit fields for workflow type and KPI metric, value, and period.
- Added record summary metadata for faster scanning.
- Kept all record changes on the existing authenticated `/api/records` API.

## Verification Result

`npm test` passes. `node --check public/app.js` passes.

## 2026-05-18: SQLite Default Store Decision

## Documentation-First Status

This entry was created before implementation. The intended change is to decide whether SQLite should become the default local store now that the SQLite implementation and import command exist.

## Intended Change

Record a decision about the default store for the next development phase.

## Reason

SQLite is implemented, but Node reports `node:sqlite` as experimental in this runtime. Switching defaults too early could introduce runtime instability for a client-facing demo.

## Expected Behavior

- Documentation clearly states the default store decision.
- Runtime behavior changes only if the decision supports it.
- Future agents understand how to run either JSON or SQLite.

## Security and Operational Risk

Storage default changes affect data location, backup behavior, migration expectations, and demo reliability. The decision should prioritize a stable client conversation and avoid surprise data location changes.

## Verification Plan

- Update `STORAGE_DECISION.md`, `README.md`, `CHANGELOG.md`, and `NEXT_AGENT_HANDOFF.md`.
- Run `npm test`.

## Implementation Result

- Kept JSON as the default store for the client-demo phase.
- Documented SQLite as opt-in with `STORE_TYPE=sqlite`.
- Documented the reason: `node:sqlite` works but is experimental in this runtime.

## Verification Result

`npm test` passes.

## 2026-05-18: Production Authentication Design and Storage Direction

## Documentation-First Status

This entry was created before implementation. The intended change is to document the production authentication model and the storage direction before any real client data, external integrations, or deployment work begins.

## Intended Change

Add production-readiness documentation for:

- Authentication and authorization design.
- Workspace membership and role boundaries.
- Session, secret, audit, and integration-token handling.
- Storage direction after the local JSON MVP.

## Reason

The current access key is only a local development safeguard. Before real client data is used, the project needs a clear production access model and a storage decision that supports workspace separation, auditability, backups, and future integrations.

## Expected Behavior

- Documentation clearly states that `ACCESS_KEY` is not production authentication.
- Future implementation agents know which auth model to build toward.
- Future implementation agents know whether to keep JSON, move to SQLite, or use a hosted database.
- Handoff docs identify the next implementation step after these decisions.

## Security and Operational Risk

Weak authentication or unclear workspace authorization could expose business operations data across clients. Storage decisions affect backup, recovery, audit trails, data portability, and future compliance posture. No real client data should be entered until these decisions are implemented, tested, and reviewed.

## Verification Plan

- Add dedicated authentication design documentation.
- Add dedicated storage decision documentation.
- Update `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `CHANGELOG.md`, and `NEXT_AGENT_HANDOFF.md`.
- Run `npm test` to ensure documentation-only changes did not disturb the app.

## Implementation Result

- Added `AUTHENTICATION_DESIGN.md` with production auth, workspace membership, roles, session handling, token handling, enforcement, and blockers.
- Added `STORAGE_DECISION.md` selecting SQLite as the next storage target and deferring hosted database selection.
- Linked both documents from `README.md`, `ARCHITECTURE.md`, and `SECURITY.md`.

## Verification Result

`npm test` passes.

## 2026-05-18: SQLite Migration Interface

## Documentation-First Status

This entry was created before implementation. The intended change is to prepare the codebase for the SQLite migration without replacing JSON storage in the same step.

## Intended Change

Add a storage interface boundary and migration command placeholder so future agents can implement SQLite behind the same contract currently used by `JsonStore`.

## Reason

The current server imports `JsonStore` directly. Before adding SQLite, the app needs a clear storage contract so tests and API behavior remain stable during the migration.

## Expected Behavior

- Server code depends on a storage implementation contract, not JSON-specific behavior.
- JSON storage continues to work.
- Tests continue to pass.
- Migration command exists and clearly states that SQLite migration is not implemented yet.
- Documentation points future agents to the next exact step.

## Security and Operational Risk

This step should not change runtime data behavior. It reduces future migration risk by keeping the app contract stable. The migration placeholder must not pretend to migrate data.

## Verification Plan

- Add storage contract documentation in code.
- Add a migration command placeholder.
- Update `README.md`, `STORAGE_DECISION.md`, `CHANGELOG.md`, and `NEXT_AGENT_HANDOFF.md`.
- Run `npm test`.

## Implementation Result

- Added `src/storage-contract.js` with storage contract version and required method list.
- Added `contractVersion` to `JsonStore`.
- Added `scripts/migrate-sqlite.js` placeholder.
- Added `npm run migrate:sqlite`.

## Verification Result

`npm test` passes. `npm run migrate:sqlite` exits with code 1 by design and prints the next implementation steps.

## 2026-05-18: SQLite Store Implementation

## Documentation-First Status

This entry was created before implementation. The intended change is to add a SQLite-backed storage implementation behind the existing storage contract while keeping JSON storage as the default during transition.

## Intended Change

Add:

- SQLite schema creation for workspaces, profiles, assistant outputs, tasks, SOPs, workflows, KPI entries, and audit logs.
- A `SQLiteStore` implementation that satisfies `src/storage-contract.js`.
- Store contract tests that can run against JSON and SQLite implementations.
- A clear runtime selection path for future migration work.

## Reason

SQLite is the selected next storage target. Implementing it behind the storage contract improves reliability, querying, and migration readiness without forcing hosted infrastructure yet.

## Expected Behavior

- Existing JSON behavior remains unchanged by default.
- SQLite store can initialize an empty database file.
- SQLite store supports the same methods as `JsonStore`.
- Tests verify equivalent behavior for JSON and SQLite stores where practical.
- No real client data is migrated automatically in this batch.

## Security and Operational Risk

SQLite still requires local filesystem protection and does not replace authentication or authorization. This batch must not silently migrate or expose existing JSON data. Database files should remain ignored by git. If built-in SQLite support is unavailable, the implementation should stop at documented blockers instead of adding an unreviewed dependency.

## Verification Plan

- Check runtime support for built-in SQLite.
- Add SQLite implementation only if supported without external dependencies.
- Add tests for schema initialization and store contract behavior.
- Run `npm test`.
- Update `STORAGE_DECISION.md`, `CHANGELOG.md`, and `NEXT_AGENT_HANDOFF.md`.

## Implementation Result

- Confirmed built-in `node:sqlite` is available in the current Node runtime.
- Added `src/sqlite-store.js` using built-in `node:sqlite`.
- Added SQLite schema creation for workspaces, profiles, assistant outputs, tasks, SOPs, workflows, KPI entries, and audit logs.
- Added `src/store-utils.js` to share validation and sanitization between stores.
- Added `src/store-factory.js` with `STORE_TYPE=json|sqlite` runtime selection.
- Updated `npm run migrate:sqlite` to initialize the SQLite schema.
- Added contract tests that run against both JSON and SQLite stores.

## Verification Result

`npm test` passes. `npm run migrate:sqlite` initializes `data/operations-assistant.sqlite`. Node reports that `node:sqlite` is experimental.

## 2026-05-18: JSON to SQLite Import Command

## Documentation-First Status

This entry was created before implementation. The intended change is to add a one-time import command that copies existing local JSON workspace data into SQLite.

## Intended Change

Add an import command that reads the JSON store, initializes SQLite, and writes equivalent workspace data through the SQLite store contract.

## Reason

SQLite is now available, but existing local JSON prototype data needs a safe migration path. Import should be explicit and user-run, not automatic at app startup.

## Expected Behavior

- Command reads `DATA_FILE` or the default JSON data path.
- Command writes to `SQLITE_FILE` or the default SQLite path.
- Command initializes the SQLite schema if needed.
- Command imports profiles, outputs, operational records, KPI entries, and audit logs.
- Command reports imported workspace count.
- Command does not delete or modify the JSON source.

## Security and Operational Risk

Importing data copies potentially sensitive local business information. The command must not send data over the network, must not delete the source JSON, and must keep SQLite files ignored by git.

## Verification Plan

- Add import command.
- Add tests using temporary JSON and SQLite files.
- Run `npm test`.
- Run the import command on default local files if a JSON source exists.

## Implementation Result

- Added `src/import-json-to-sqlite.js`.
- Updated `npm run migrate:sqlite` to import JSON data into SQLite.
- Preserved JSON source files during import.
- Added import tests with temporary JSON and SQLite files.

## Verification Result

`npm test` passes. `npm run migrate:sqlite` currently exits with code 1 in this workspace because `data/operations-assistant.json` does not exist yet; that is expected until local JSON data is created or `DATA_FILE` is provided.

## 2026-05-18: Local Backup and Restore Documentation

## Documentation-First Status

This entry was created before implementation. The intended change is to document local backup and restore procedures for JSON and SQLite runtime data.

## Intended Change

Add a backup and restore guide covering:

- JSON runtime data.
- SQLite runtime data.
- Safe copy locations.
- Restore commands.
- Warnings about secrets and client data.

## Reason

The app now has two local storage modes. Future agents and users need clear instructions for protecting local MVP data before testing migrations, switching stores, or making larger changes.

## Expected Behavior

- Documentation explains how to back up local data before risky changes.
- Documentation explains how to restore JSON and SQLite data.
- Handoff points future agents to the backup procedure.

## Security and Operational Risk

Backups may contain sensitive business operations data. Backup files must not be committed, emailed casually, or placed in shared folders without client approval.

## Verification Plan

- Add backup/restore documentation.
- Update `README.md`, `CHANGELOG.md`, and `NEXT_AGENT_HANDOFF.md`.
- Run `npm test`.

## Implementation Result

- Added `BACKUP_RESTORE.md`.
- Linked backup and restore procedures from `README.md`.
- Updated changelog and handoff.

## Verification Result

`npm test` passes.

## 2026-05-18: Workspace Record CRUD

## Documentation-First Status

This entry was created before implementation. The intended change is to add workspace-scoped CRUD operations and browser views for operational records created or managed by the assistant.

## Intended Change

Add create, update, and delete support for four workspace-scoped record types:

- `tasks`
- `sops`
- `workflows`
- `kpiHistory`

The UI should show editable lists for these records so a user can turn assistant output into trackable work.

## Reason

The assistant currently creates placeholders, but owners need to manage those records directly. CRUD support turns generated recommendations into operational follow-through: task tracking, SOP drafting, workflow review, and KPI review.

## Expected Behavior

- API endpoints validate access key, workspace ID, collection name, record ID, and payload size.
- Records are scoped to a single workspace.
- Created and updated records receive timestamps.
- Deleted records are removed from the workspace collection.
- All create, update, and delete actions write audit-log entries.
- Browser views allow creating, editing, and deleting basic records for each collection.

## Security and Operational Risk

This is still local-only and not production authorization. Invalid collection names, invalid record IDs, oversized fields, and cross-workspace access must be rejected. Deleting records is allowed only inside the selected workspace and must be logged. No secrets or regulated information should be entered into these records.

## Verification Plan

- Add store tests for record create, update, delete, validation, and audit logging.
- Add API tests for record CRUD, invalid collections, invalid IDs, and auth enforcement.
- Run `npm test`.
- Start the app with `ACCESS_KEY` and manually test task, SOP, workflow, and KPI record management.

## Implementation Result

- Added workspace-scoped create, update, and delete methods for `tasks`, `sops`, `workflows`, and `kpiHistory`.
- Added `/api/records` with `POST`, `PUT`, and `DELETE` support.
- Added browser views for creating, editing, and deleting operational records.
- Added audit logging for record create, update, and delete actions.
- Fixed default state cloning so workspaces do not share an in-memory default object before persistence.

## Verification Result

`npm test` passes.
