# 0.2.0-alpha.1 — GB native workbench

## Delivered

- **First use:** one explicit setup command creates a private Python venv and pinned GB checkout under the chosen workspace. `--check` performs no downloads. Existing environments can be reused. Native configuration fields save through Harness's version-checked settings API; subsequent requests read the current values.
- **Data selection:** bounded workspace-folder browsing, CSV/XLSX/XLS sheet and column metadata, explicit target/sample/group/split/predictor mapping, a normalized copy, SHA-256 import provenance and retained/excluded target counts. Duplicate column names, stale sources, role overlap and text predictors are rejected. Original inputs are preserved.
- **Results:** native React workbench under **插件 → GB 工作台**, with candidate filtering, display sorting, multi-candidate comparison, CSV/Markdown downloads and direct PNG display. Display controls never rewrite scientific ranking. No iframe HTML is used for this panel.
- **Models:** selected eligible Pipeline_ID export through GB's stored-run API, calibration-only refit, original feature schema and export record. Prediction accepts an own-scope registered model, checks artifacts and source, matches/reorders every feature, reports ignored metadata and writes a prediction CSV/manifest.

The conversation preset now exposes nine GB tools. Existing Markdown/CSV/PNG `present` cards remain the conversation default. Workbench actions are deterministic local actions and require no LLM call; model-driven conversations still use the existing Harness model configuration.

## Storage and lifecycle

The workbench owns `.dsh-gb/workbench/` and cannot select arbitrary conversation scopes. Conversation tools use their existing session hash. Workbench background operations use the host's managed subprocess provider and a plugin-owned lifecycle, independently of an active Agent or global job controller. Closing/reopening the panel leaves running work alive. Plugin/host disposal cancels managed processes and waits for cleanup. A host restart does not preserve a live process; saved plans/checkpoints can be resumed from history.

This is a local authenticated-host interface, not a multi-user authorization boundary. Paths are resolved and confined, not protected against a hostile local process concurrently rewriting the filesystem. Registered bundle hashes detect ordinary modifications; they are not signatures. Do not load arbitrary untrusted joblib files. Download size is capped at 8 MiB, interactive input at 128 MiB/20,000 columns, folder listing at 200 entries, and analysis at 32 candidates/4 workers.

## Scientific limits

CV metrics order the declared library; internal holdout is displayed separately. Selecting a candidate after viewing holdout compromises its confirmatory interpretation. Export does not refit on holdout, rerun whole-library CV, or establish universal superiority. Prediction alone provides no accuracy estimate without independent observed labels. Transformed Overfit fields are not raw metric differences.

## Verification

- Real Harness schema, scoped preset, subprocess cancellation/resume and independent-workbench runtime tests.
- Both classification and regression: mapped original columns → two-candidate run → selected export → reordered/renamed new-sample features → predictions equal to direct GB bundle calls.
- Excel sheet selection, duplicate headers, mapping conflicts, nonnumeric predictors, source freshness, original-file preservation, unknown candidate, cross-scope model access, missing prediction features, changed model artifacts and artifact-path escapes.
- Browser bundle and host RPC contract agree; CI rebuilds the checked-in client and rejects stale output.
- A clean isolated Windows/Python 3.13 installation was created with the setup command and its read-only readiness check passed. Dependency versions are recorded by each analysis; upstream requirements use version ranges rather than a fully frozen lock.
- One intermediate Windows CI run conservatively rejected a workspace path; the preceding and diagnostic follow-up matrix runs passed with unchanged functional code. The exact cause of that single rejection is not established. Integration suites now execute sequentially in their shared workspace, and the native workbench case repeats three seeds while requiring relative/absolute paths to produce identical plans. Boundary errors retain their resolved path and boundary for diagnosis; no check was weakened.

UI observations for this release are appended to [the validation record](UI_VALIDATION_2026-11-06.md). Small synthetic datasets validate software behavior, not scientific performance. Previous host HTML-preview and general-shell observations remain host limitations; this panel does not claim to repair either host component.
