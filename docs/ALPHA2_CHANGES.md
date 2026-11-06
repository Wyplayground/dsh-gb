# 0.1.0-alpha.2 — predictable GB analysis and result presentation

## Changes

- Adds an optional **GB 分析** Agent preset. The actual Agent receives an allow-list of the four GB tools plus `job_output`, `job_list`, `job_kill` and `present`. The restriction is installed during serial `agent/created` initialization. Preset-shared parent scopes are not restricted: doing so would also hide the parent's presentation tool from child Agents. Standard sessions retain their tools.
- Dataset inspection now returns configured paths, Python/dependency versions, a real output-writability check, file readiness, target column and a bounded feature-name preview. It does not need a shell probe or raw input rows.
- Result reading produces `gb_summary.md` directly from recorded metrics and statuses, indexes PNG plots alongside root artifacts, and returns a typed presentation manifest. The default files are summary, CSV and a task-specific diagnostic PNG. HTML remains supplementary.
- Empty/failed candidate sets are represented explicitly. No metrics are invented. Artifact-index limits and truncation are reported; unsafe summary symlink destinations are refused.
- Python bytecode/cache files are excluded from the distributed bundle.

## Limits

This release restores a usable default result view; it does not repair the host's HTML iframe renderer. It removes the GB preset's dependency on general command execution; it does not change Windows ACLs, grant administrator access or repair the host's generic PowerShell tool. Native Markdown/CSV/PNG viewers remain host capabilities. There is no new custom dashboard and no OS isolation claim.

The deterministic summary is the primary numerical reference. Model-generated interpretation still requires review; transformed `Overfit_*` diagnostics must not be treated as percentage-point drops or raw metric differences.

## Verification

- Real Harness registry/scope tests cover a shared preset parent and separate child Agents, allowed presentation/job tools, blocked shell/file tools, unaffected standard Agents, and disposal.
- Python integration tests compare classification and regression metrics against direct GB engine calls, exercise checkpoint resume and input/session boundaries, and verify the summary, plot index and default presentation manifest.
- Result-view tests cover an all-failed candidate set, missing plots, safe Markdown cells and nonfinite values.
- The real local subprocess test still verifies cancellation, managed-range cleanup and checkpoint resume.

The installed test bundle was checked against the edited source before interface testing. Browser test observations are recorded in `UI_VALIDATION_2026-11-06.md`; local screenshots and generated run files remain under the ignored `.runtime/` directory.
