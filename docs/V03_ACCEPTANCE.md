# 0.3.0-alpha.1 changes and acceptance

Recorded on 2026-11-06. Target host: DeepSeek Harness 0.2.2-rc.1. Local development and browser validation: Windows, Python 3.13.12. Credentials, source datasets, local execution outputs and account screenshots are excluded from Git.

## 1. Windows paths and interruption recovery

Path comparisons now handle Windows extended-length and UNC aliases component by component, without weakening the workspace boundary. Tests cover sibling-prefix escapes, different drives, relative/absolute paths, a junction within the workspace and a junction pointing outside it. The historical isolated CI path rejection did not record the actual rejected path; its original cause is not proven.

A separately reproducible startup-cancellation bug was fixed: disposing a host before the worker created its run directory previously left a plan as `not_started`. Cleanup now writes an owned interrupted state even before startup. A new host context can read it and resume. Late cancellation preserves a genuinely completed state. Local real-subprocess tests verify cleanup and checkpoint recovery.

## 2. Real DeepSeek conversation

The logged-in DeepSeek-V4.1-Flash account completed all nine GB tools in the native GB conversation preset: folder listing, column inspection, explicit mapping, data inspection, planning, background run, results, export and prediction. Native `present` displayed Markdown, CSV and diagnostic PNG; the prediction CSV rendered in the native spreadsheet sidebar. No generic shell tool was exposed or called.

The conversation used bread storage data with 324 rows, 142 predictors, 36 groups and the existing 270/54 calibration/validation split. Raw / None / PLS Regression, exploration mode, 3 outer folds, 2 inner folds and seed 42 produced CV RMSE 3.6005 and internal-holdout RMSE 2.7488 in the earlier, unpinned environment. This conversation occurred before applying the new dependency lock. These are observed workflow outputs, not independent scientific validation. Prediction used five rows extracted from the same source without labels, solely to verify feature matching and output rendering.

One recoverable model tool error occurred: it attempted inspection before mapping nonstandard columns. The tool rejected the missing required names; the model then mapped the file and completed the workflow. The UI did not silently fit a replacement analysis.

## 3. Real data and stability

The authorized local project supplied three unchanged source files:

| Dataset | Rows | Features | Groups | Source SHA-256 |
|---|---:|---:|---:|---|
| Bread storage regression | 324 | 142 | 36 | `4a9d404f4b4b09be1a32b09925bcb8527c0ad5b1d74af0aaa77f81fabff57e18` |
| Fish water regression | 908 | 256 | 51 | `11a888f6140889960f5c0783ac5f0a0d77cbc29264179518328c9e5a336cabba` |
| Olive classification | 118 | 4001 | none | `228cd3e8cbbef77b4417f8f96ed7205478c7dfb9a07ff4f9d90664b160a92107` |

`scripts/validate_real_data.py --data-root PATH` copies these inputs into ignored acceptance storage, preserves existing Split/Group assignments, and compares Raw/SNV + None + PLS results with direct calls to the pinned original GB engine. All numeric CV/Cal/Val metrics matched at tolerance 1e-10; original file hashes remained unchanged. These are adapter-equivalence checks against the same engine, not comparisons with independent implementations.

Failure tests retain an explicitly failed candidate alongside a successful candidate and verify that paging does not hide the failure. Other tests cover changed data/source, foreign scope/model access, modified model artifacts, missing features, duplicate column names and reordered prediction features.

## 4. Native installation

The workbench now starts the same private installer as the CLI, shows progress, supports cancellation/retry and recovers saved setup. Applying the verified configuration uses the host's version-checked configuration form. The installer pins GB source, refuses to replace a dirty or foreign checkout, serializes installation and publishes setup metadata atomically. System Python receives no packages.

Harness must be restarted after installing a version with a changed RPC contract. During local upgrade, pnpm 11 asked for build-script decisions on inherited native packages. Explicitly denying those scripts allowed the plugin update; no build-script approval was needed. This is a host package-manager setting, separate from Python wheel hash verification.

The native UI created a fresh private environment, displayed completed installation, applied all three paths through the host configuration form, and reported **环境就绪 · Python 3.13.12 · 固定依赖匹配 · 输出可写**. The equivalent read-only CLI check also passed with the same lock hash. The installed environment then mapped the real bread data, preserved all 324 rows/142 features/36 groups/existing Split, created a new plan and completed 1/1 candidates with no failures. In this pinned environment its CV RMSE was **3.159462**, internal-holdout RMSE **2.748824**. The CV difference from the earlier conversation is an environment-sensitive result, not a plugin-equivalence assertion across dependency versions. Comparisons with direct GB in section 3 use this same pinned environment.

## 5. Exact dependency lock and compatibility

All 46 direct/transitive Python dependencies have exact versions. `requirements.lock` contains wheel SHA-256 hashes; installation uses `--require-hashes --only-binary=:all:`. The manifest binds the version inventory and requirements file, with canonical newline handling across OSes. Platform/Python markers select the matching packages. Planning, execution, export and prediction require the matching lock; plans and models record package versions. Old results remain readable, while incompatible/unlocked models require a fresh compatible plan and export.

Fresh local private-environment installation, `pip check` and lock validation passed on Windows/Python 3.13. Local automated acceptance passed 12 Node tests and 15 Python tests. CI is expanded to six OS/Python combinations: Windows, Linux and macOS × Python 3.10 and 3.13, including a clean installer smoke check. Consult the commit's Actions result for remote completion; Python 3.11/3.12 are accepted but not separate matrix entries. Native macOS/Linux browser UI has not been exercised here.

The baseline deliberately uses compatible fixed versions, including numpy 2.2.6, pandas 2.2.3, scipy 1.15.3, scikit-learn 1.6.1, matplotlib 3.10.3 and xgboost 3.0.2. A lock is reproducibility control, not a claim that every inherited upstream Node dependency is free of published advisories. The targeted prerelease Harness dependency tree still contains upstream audit findings; this change does not run a forced dependency upgrade.

## 6. Full 990-candidate library

Explicit `library: "full"` enumerates 15 preprocessing methods × 6 selectors × 11 task-specific models, rejecting mixed custom method lists. Custom plans remain capped at 32. Evaluation mode is independent of library size. Worker limits, immutable plans, progress, stop/resume and explicit failure rows remain enforced. Conversations/MCP page at most 100 candidates; the native workbench can inspect the complete table; the CSV retains every row.

An actual full regression run completed **990/990**, all 990 rows successful, in approximately 18.3 minutes on the local machine. It used a tiny synthetic 16-row/8-feature dataset, exploration, 2 outer/2 inner folds, seed 73 and 4 workers. This is a software smoke test of enumeration and execution, not performance evidence for real scientific data. Classification enumeration is also tested; a full 990-candidate classification run was not performed.

## 7. MCP

The stdio server shares the scientific backend and has its own named scope. It exposes 13 tools and generated artifact resources, no network listener and no model credentials. Official client 2.4.0 completed the full workflow and path/resource rejection tests; the target Harness's bundled client 2.2.0 connected and discovered all tools. See [MCP setup](MCP.md) for standalone installation and application configuration.
