# Production Authentication Design

## Status

This is the target production design. It is not implemented yet. The current `ACCESS_KEY` mechanism is only a local development safeguard and must not be treated as production authentication.

## Goals

- Protect business operations data by authenticated user and workspace.
- Prevent cross-client data access.
- Support owner, manager, staff, and future consultant roles.
- Maintain auditability for sensitive changes.
- Keep integration credentials isolated from app users and source code.

## Recommended Model

Use a managed authentication provider for production rather than building password storage directly. Good candidates include Auth0, Clerk, WorkOS, Supabase Auth, or a cloud provider identity service.

Required capabilities:

- Email-based login with MFA support.
- Session management with secure, HTTP-only cookies.
- Workspace membership records stored server-side.
- Role-based authorization checked on every workspace request.
- Account recovery handled by the provider.
- Admin ability to revoke sessions and workspace membership.

## Workspace Authorization

Every protected request must resolve:

- `userId`: authenticated user.
- `workspaceId`: selected business workspace.
- `role`: user role in that workspace.

The server must verify that the user belongs to the workspace before returning or modifying data. Never trust a workspace ID from the browser without checking membership server-side.

Recommended initial roles:

- `owner`: manage workspace, users, data, integrations, and billing.
- `manager`: manage operations records, SOPs, tasks, workflows, and KPIs.
- `staff`: view assigned records and update allowed task fields.
- `viewer`: read-only access.

## Session and Token Handling

- Use secure, HTTP-only, same-site cookies for browser sessions.
- Do not store auth tokens in local storage.
- Rotate session secrets.
- Expire idle sessions.
- Log sign-in, sign-out, failed access, membership changes, and role changes.

## Integration Credentials

Future QuickBooks, CRM, project management, and automation integrations must store OAuth tokens in a managed secret store or encrypted database fields. Tokens must be scoped minimally, revocable, and never exposed to the browser.

## Required API Enforcement

Before production, replace `X-Access-Key` checks with middleware that:

1. Verifies the user session.
2. Loads workspace membership.
3. Checks role permission for the requested action.
4. Logs denied access attempts.
5. Returns safe errors without leaking workspace existence.

## Production Blockers

Do not use real client data until these are implemented:

- Managed auth provider selected.
- Workspace membership table created.
- Role checks enforced on every API route.
- Secure session cookies configured.
- Audit logs include user ID and workspace ID.
- Integration credentials storage design reviewed.
- Backup and deletion policies documented.
