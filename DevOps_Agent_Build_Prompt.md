# Dev/Ops Agent Build Prompt

## Mission

Build a secure AI bot assistant that helps small-business owners run daily operations. The assistant should act as an Operations Role AI Agent: documenting workflows, coordinating tasks, monitoring resources, tracking KPIs, and helping the owner make better operating decisions without replacing qualified legal, tax, HR, payroll, insurance, or financial professionals.

Use `Operation_Role_AI_Agent.md` as the product behavior source of truth.

## Non-Negotiable Rule: Documentation First

Before making any code, configuration, prompt, schema, infrastructure, or dependency change, update the relevant documentation. If no document exists, create one first.

Every change must document:

- What is being changed.
- Why the change is needed.
- Expected user or system behavior.
- Security, privacy, or operational risk.
- How the change will be tested or verified.
- What the next agent should do next.

If documentation is missing or stale, stop implementation and update docs before continuing.

## Initial Build Objective

Create an MVP Operations Assistant that can:

- Intake business context: business type, team size, tools, workflows, pain points, and goals.
- Produce daily and weekly operations reviews.
- Create SOPs, checklists, task plans, and bottleneck reports.
- Track 3-4 operating KPIs.
- Recommend workflow improvements and safe automations.
- Maintain a clear activity log and handoff summary.

## Required Documentation

Create and keep updated:

- `README.md`: product overview, setup, commands, and local usage.
- `ARCHITECTURE.md`: system design, data flow, major components, and integration boundaries.
- `SECURITY.md`: data handling, secrets management, authentication, authorization, logging, and threat assumptions.
- `CHANGELOG.md`: dated summary of meaningful changes.
- `NEXT_AGENT_HANDOFF.md`: current state, completed work, open decisions, blockers, and exact next steps.

Update `AGENTS.md` whenever contributor rules or build process expectations change.

## Recommended MVP Architecture

Start with the smallest secure architecture that can grow:

- Frontend: simple authenticated web UI for owner/operator interaction.
- Backend: API service for chat, workflow generation, KPI summaries, and business profile storage.
- Data store: persistent storage for business profiles, workflows, SOPs, tasks, KPI definitions, and audit logs.
- AI layer: prompt templates and tool orchestration for operations workflows.
- Integrations: design interfaces for QuickBooks, CRM, project management, spreadsheets, and automation tools, but stub external integrations until security and auth are clear.

Avoid connecting to real client systems until credentials, consent, scopes, logging, and rollback behavior are documented.

## Security Requirements

Build safe and secure code from the first commit:

- Never hard-code secrets or API keys.
- Use environment variables for configuration.
- Validate and sanitize all user inputs.
- Store only the minimum business data required.
- Separate user accounts and business workspaces.
- Require authentication before accessing business data.
- Log important actions without exposing sensitive content.
- Add audit trails for generated SOPs, task changes, KPI changes, and integration actions.
- Fail safely when AI output is uncertain or an integration call fails.
- Clearly label AI-generated recommendations for human review.

Do not let the assistant make final legal, tax, HR compliance, payroll, insurance, safety, or major financial decisions.

## Agent Behavior Requirements

The assistant should:

- Ask clarifying questions when business context is missing.
- Prefer simple executable workflows over complex systems.
- Document current state before recommending automation.
- Provide outputs with owners, due dates, priorities, and KPI impact.
- Escalate regulated or high-risk issues to qualified professionals.
- Keep responses concise and usable by a busy owner.

Default response format:

```text
Situation:
Risk or Opportunity:
Recommendation:
Next Actions:
Documentation or SOP Impact:
```

## Suggested First Sprint

1. Update required documentation before implementation.
2. Choose the application stack and justify it in `ARCHITECTURE.md`.
3. Create the business intake workflow.
4. Build the core assistant prompt and response templates.
5. Add storage for business profile, workflows, tasks, KPIs, and activity logs.
6. Implement daily operations review generation.
7. Implement weekly operations review generation.
8. Add authentication and workspace separation.
9. Add tests for prompt behavior, API validation, and access control.
10. Update `NEXT_AGENT_HANDOFF.md` with exact next steps.

## Verification Expectations

Before handing off, run available checks and document the result:

- Formatting and linting.
- Unit tests.
- Security-sensitive tests for auth, data access, and input validation.
- Manual smoke test of business intake, daily review, weekly review, and SOP generation.

If a check cannot be run, document why and what the next agent should do.

## Handoff Format

Each agent must end its work by updating `NEXT_AGENT_HANDOFF.md` with:

- Current status.
- Files changed.
- Commands run and results.
- Known risks.
- Open decisions.
- Recommended next task.
