# Security

## Security Model

This MVP is local-first and dependency-free. It is intended for early product validation, not production deployment with real client data. It requires a local `ACCESS_KEY` to reduce accidental access during development. Production use requires full authentication, authorization, encrypted storage, backup policy, and reviewed third-party integration scopes.

## Data Handling

- Store only the minimum business information required for operations workflows.
- Do not store API keys, passwords, bank details, payroll details, tax identifiers, or regulated employee information.
- Keep local runtime data in `data/`.
- Separate records by workspace ID.
- Treat all business information as confidential.

The current JSON file store is for local MVP use. The next storage target is SQLite, documented in `STORAGE_DECISION.md`; it still requires filesystem protection and does not replace application authorization.

## Secrets

Do not hard-code secrets. Set `ACCESS_KEY` when starting the local server. Future integrations must use environment variables or a managed secret store. `.env` files must remain local and should not be committed.

## Input Validation

All API endpoints must:

- Accept JSON only where expected.
- Enforce request size limits.
- Validate required fields.
- Validate workspace IDs.
- Validate generated output IDs and owner review statuses.
- Validate collection names and record IDs for workspace record CRUD.
- Reject unsupported assistant actions.
- Return safe error messages without exposing internals.

## Access Control

The first MVP uses a single local access key and workspace IDs. Before production use, replace this with authenticated users, business workspace separation backed by server-side authorization, role-based access, and audit trails for all data-changing actions.

The target production model is documented in `AUTHENTICATION_DESIGN.md`. That design must be implemented before real client data, third-party integrations, or public deployment.

## AI Safety Boundaries

AI-generated outputs must be labeled as recommendations for human review. The assistant must escalate legal, tax, HR compliance, payroll, insurance, safety, and major financial decisions to qualified professionals.

Generated outputs default to pending review. A user may mark outputs as approved, rejected, or needing changes, but this local status does not replace production authorization or regulated professional review.

Task, SOP, workflow, and KPI records are operational notes only. Do not enter passwords, API keys, payment data, payroll details, tax identifiers, medical information, or regulated employee information.

## Change Risk

Before code or configuration changes, update documentation with the intended behavior, risk, and verification plan. This keeps future agents aligned and reduces unsafe drift.
