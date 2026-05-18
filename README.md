# Operations Assistant MVP

This project is the starting point for a secure AI-assisted operations bot for small businesses. The assistant helps owners document workflows, create SOPs, review daily operations, produce weekly summaries, track KPIs, and prepare safe recommendations for human review.

The product behavior is defined in `Operation_Role_AI_Agent.md`. The build rules and handoff expectations are defined in `AGENTS.md` and `DevOps_Agent_Build_Prompt.md`.

## Current Implementation

The first implementation uses a dependency-free Node.js service with a small browser UI. This keeps the MVP easy to run locally while the team validates product behavior, security expectations, and data model assumptions.

Current components:

- `src/server.js`: local HTTP API and static file server.
- `src/operations-agent.js`: deterministic assistant workflow logic and prompt templates.
- `src/store.js`: local JSON persistence for business profile, tasks, workflows, KPIs, and audit logs.
- `public/`: browser UI assets.
- `tests/`: Node test runner coverage for core workflows and security-sensitive validation.

## Commands

- `ACCESS_KEY="replace-with-local-key" npm start`: run the local MVP server.
- `npm test`: run the Node test suite.
- `npm run check`: run tests as the current verification gate.
- `npm run migrate:sqlite`: import local JSON data into SQLite.

## Local Usage

After implementation, start the app with:

```sh
ACCESS_KEY="replace-with-local-key" npm start
```

Then open `http://127.0.0.1:3000`.

Enter the same access key in the browser. Local runtime state is stored in `data/operations-assistant.json` and is ignored by git.

The MVP now separates local data by workspace. Use a short workspace ID such as `demo-client` or `main-office` when saving profiles and generating outputs.

JSON storage remains the default for the client-demo phase. SQLite is available for local testing. To import local JSON data and run against SQLite:

```sh
npm run migrate:sqlite
STORE_TYPE=sqlite ACCESS_KEY="replace-with-local-key" npm start
```

## Safety Boundaries

The assistant provides operational recommendations only. It must not make final legal, tax, HR compliance, payroll, insurance, safety, or major financial decisions. Those issues must be escalated to qualified professionals.

## Production Readiness

The current access key is for local development only. Before real client data is used, implement the production authentication model in `AUTHENTICATION_DESIGN.md`.

The next storage target is SQLite, documented in `STORAGE_DECISION.md`. The current JSON file store remains a prototype mechanism.

Local backup and restore procedures are documented in `BACKUP_RESTORE.md`.
