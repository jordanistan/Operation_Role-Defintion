# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains documentation for business operations role definition work. The root-level `Operation_Role-Defintion.md` is the primary source document. Keep new contributor-facing or project-level documents at the repository root unless the collection grows large enough to justify folders.

Suggested future structure:

- `docs/` for long-form prompts, role profiles, and client-facing guidance.
- `assets/` for referenced images, diagrams, or exports.
- `tests/` only if executable templates, scripts, or validation tooling are added.

## Build, Test, and Development Commands

There is no application build system or package manager configured yet. Use lightweight local checks when editing Markdown:

- `rg "term" .` searches repository text quickly.
- `wc -w *.md` checks approximate document length.
- `markdownlint *.md` validates Markdown style if `markdownlint` is installed.

Do not introduce build tooling unless the repository gains generated outputs, scripts, or a repeatable publishing workflow.

## Coding Style & Naming Conventions

Write Markdown with clear headings, short paragraphs, and direct instructional language. Use sentence case for section headings unless a document has an established title style. Prefer bullet lists for scannable responsibilities, requirements, and process steps.

Use descriptive filenames with hyphens for new documents, for example `operations-role-profile.md`. Preserve existing filenames unless a rename is explicitly requested, since external references may depend on them.

## Testing Guidelines

No automated tests are currently defined. For documentation changes, verify:

- Markdown renders cleanly in a standard previewer.
- Headings are hierarchical and not skipped unnecessarily.
- Examples are specific, actionable, and consistent with the document objective.
- Spelling and terminology are consistent across files.

If scripts or templates are added later, include focused tests for generated output and document the test command here.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so no repository-specific commit convention can be inferred. Use concise, imperative commit messages such as `Add operations role guide` or `Revise KPI examples`.

Pull requests should include a short summary, the reason for the change, and any relevant before-and-after notes for substantial document edits. Link related issues or client requests when available. Include screenshots only when the change affects rendered formatting or visual assets.

## Agent-Specific Instructions

Documentation comes first. Before changing code, configuration, architecture, prompts, workflows, or dependencies, update the relevant Markdown document with the intended change, reason, expected behavior, and security impact. If documentation is not updated first, the work is out of process.

Keep edits scoped to the requested document or implementation task. Do not add dependencies, generated files, or directory structure unless the task requires them. When updating prompts, agents, or role profiles, preserve the intended audience, tone, and required output sections.

For future software work, maintain a current build handoff document that tells the next agent where to start, what changed, what remains open, and how to verify the system. Treat security, data privacy, access control, auditability, and safe failure behavior as required implementation concerns, not optional polish.
