# dsh-gb

Grand Banquet chemometrics tools for DeepSeek Harness. Alpha **0.3.0-alpha.1** targeting **DSH 0.2.2-rc.1**.

The native **插件 → GB 工作台** panel provides private-environment installation, file browsing, CSV/Excel column mapping, candidate comparison, verified model export and prediction. This release locks Python dependencies including wheel hashes, adds an explicit 990-candidate library and a local stdio MCP server. The optional **GB 分析** mode and native Markdown/CSV/PNG cards remain available. See [0.3 changes and acceptance](docs/V03_ACCEPTANCE.md) and [MCP setup](docs/MCP.md).

This independent plugin wraps the existing GB Python engine. It does not replace its scientific methods or require a second DeepSeek API key. Raw data stays in the configured local workspace; model-facing results contain metadata and bounded result summaries. Harness receives the tool arguments, paths, settings and summaries, so these are part of the conversation context.

## Setup

Requirements: Node.js compatible with DSH, Git, Python 3.10–3.13, and a working DSH web profile with `tools`, `subprocess`, `jobs` and job-control tools. Windows is the initial development platform. The plugin refuses to run until paths are configured.

```powershell
git clone https://github.com/Wyplayground/dsh-gb.git
cd dsh-gb
npm install --ignore-scripts
dsh plugin --profile web add ./
```

Launch `dsh web`, open **插件 → GB 工作台**, enter an installation folder and choose **创建独立环境并安装 GB**. Review progress, then choose **使用此环境并检查**. The installer fetches the exact source revision from `gb.lock.json`, creates a private venv under `<workspace>/.dsh-gb/runtime/`, and installs every Python dependency from `requirements.lock` with exact versions, wheel hashes and no source builds. It does not modify system Python. Git and a Python 3.10–3.13 executable must already be available; the Python path field selects the base interpreter. Interrupted installation can be retried; **读取已有安装** recovers its saved configuration.

The equivalent command is `python scripts/install.py --workspace "D:/GB-analysis" --install-deps`. Recheck without downloads using `python scripts/install.py --workspace "D:/GB-analysis" --check`. Both CLI and UI use the same installer. A plugin update that changes the native RPC contract requires restarting Harness and refreshing the page before using new controls.

An existing environment must match this release's dependency lock before preparing data, planning, running, exporting or predicting. Read-only inspection and old results remain available. Plans and models record their dependency lock and package versions; an old unlocked model must be recreated and exported from a new compatible plan. The older `scripts/setup_gb.py` remains available for development. No model credentials are copied or written by either installer.

Alternatively, override the `gb` row in the web profile's user `cordis.patch.yml` (replace all example paths):

```yaml
- id: gb
  config:
    pythonPath: 'C:/path/to/python.exe'
    gbRoot: 'D:/path/to/dsh-gb/.runtime/gb'
    workspaceRoot: 'D:/path/to/your-analysis-workspace'
```

See the official [profile patch documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md). Inspect the effective configuration with `dsh --profile web --dump-config`, then launch `dsh web`. Use the same profile for installation and launch. Desktop users must use Desktop's own plugin manager / bundled CLI and configure its profile separately.

No TypeScript build or installation-time code execution is required: the native browser bundle is checked into the repository. A pinned GitHub install can use `dsh plugin --profile web add github:Wyplayground/dsh-gb#<commit>`; Python/GB setup remains an explicit step. Use your existing Harness model login for conversations; the workbench's deterministic actions need no model call.

## Native workbench

1. Check the environment, browse a workspace folder, and choose a CSV/Excel file. For Excel, choose the sheet. Column metadata is shown without displaying the raw matrix.
2. Choose classification/regression, the target, optional sample ID, and any Group/Split columns. Select numeric predictors explicitly and review the mapping. **确认映射并检查数据** creates a copy, records the source SHA-256 and mapping, and reports excluded target rows. Input files are never overwritten.
3. Choose custom methods (up to 32 combinations) or **全部 990 候选**, select folds, generate a plan, review it, then start it. The full library is 15 preprocessing × 6 selectors × 11 models for the chosen task; it can take substantially longer. Library size and evaluation mode are separate choices. Live runs can be stopped; history offers checkpoint resume after interruption.
4. Filter candidates, sort display metrics, and check multiple candidates for side-by-side evidence. This does not rewrite stored ranking. Download CSV/Markdown or display diagnostic PNG directly in the native panel, without an HTML iframe.
5. Export an eligible candidate by its exact Pipeline_ID, then select the exported model and new-sample file. Match every training feature to its input column, generate predictions, and download the CSV. Extra columns are listed explicitly; no predictive-accuracy claim is made without independent labels.

Workbench state is saved under `<workspace>/.dsh-gb/workbench/` and is separate from conversation-owned runs. Models can be selected again after reopening the panel. Browser refresh does not cancel an analysis; host shutdown does. Workbench tasks use their own managed process lifecycle and do not require an active chat. The live task list is process-local; saved plans/results survive. The panel is available to authenticated connections to this local Harness host, not a multi-user tenant boundary.

## Tools and example workflow

Before sending the first message in a new session, select **GB 分析** from the mode menu. This optional preset exposes the nine GB tools, `job_output`, `job_list`, `job_kill` and `present`; shell execution, arbitrary file reads/searches and code generation tools are not exposed. The standard preset is unchanged. Start a new GB session after installing/updating the bundle. This is a capability restriction, not an OS sandbox or a repair to the host's general Windows shell.

For arbitrary column names, the assistant uses `gb_list_data`, `gb_inspect_columns`, and `gb_prepare_data` before the analysis sequence below. The mapping is explicit, source-bound and saved with the plan. `gb_export_model` exports a chosen eligible candidate; `gb_predict` accepts only a model_id exported by the same conversation, with an optional explicit feature mapping. It does not load arbitrary user-supplied joblib files.

1. `gb_inspect_data`: inspect local CSV/XLS/XLSX metadata, file readiness, output writability, configured workspace, Python/dependency versions and supported methods. No shell directory probe or raw-matrix read is necessary. Feature-name previews are bounded to 16 names; sample identifiers and raw feature rows are not returned. GB requires `Sample name` and `Class` (classification) or `Target` (regression), numeric feature columns, optional `Group` and `Split`. GB drops missing/non-numeric targets; the returned sample count is after filtering.
2. `gb_plan_analysis`: validate settings, check fold construction, record data/source fingerprints, and return `plan_id`. Defaults: exploration, Raw, no variable selection, PLS model, 3 outer folds, 2 inner folds, seed 42, 1 worker. Explicit Group/Split assignments are retained by GB.
3. Show the plan in the conversation, then `gb_run_analysis` with that `plan_id`. It returns a DSH job ID. Read/wait/stop using native `job_output`, `job_list`, `job_kill`.
4. `gb_read_results` returns saved state, bounded metrics, root artifact paths and an explicit PNG plot index. It writes `gb_summary.md` and returns `presentation.default_files`: the Markdown summary, CSV leaderboard and task-specific diagnostic PNG. The model passes these exact paths to native `present`, so it needs no extra glob or handwritten Windows-path Markdown links. Open the cards in the sidebar to view the summary, spreadsheet and plot. GB's HTML leaderboard remains a supplementary file; the default view does not depend on its iframe renderer. Artifact indexes cap root files at 128 and plots at 64 and report truncation explicitly.

Example prompt in **GB 分析**: “Inspect classification.csv using GB. Propose a small exploration plan with Raw preprocessing, no selection and PLS-DA. Show the plan, run it, and display the summary, result table and diagnostic plot. Explain CV/internal-holdout differences and any failures.”

Plans and runs are stored under `<workspaceRoot>/.dsh-gb/<session-hash>/`. The same plan ID is scoped to its creating session. Changing data or scientific source after planning blocks execution. Re-running an unchanged plan uses GB's checkpoints. Plugin state and native jobs are distinct: a completed job can contain scientific pipeline or export failures, which are reported as `completed_with_errors`.

## Alpha boundaries

- Custom plans allow at most 32 candidates; explicit full-library plans enumerate exactly 990. Both allow 1–4 workers and at most four concurrent workbench runs. Results retain failed candidates explicitly; conversation/MCP pages contain at most 100 rows and report total/offset, while the local CSV contains all rows.
- Interactive import supports CSV/XLSX/XLS up to 128 MiB and 20,000 columns. Directory browsing shows at most 200 entries per folder. Browser artifact downloads are capped at 8 MiB; larger artifacts remain available at their recorded local path. Prediction requires every original predictor, even when a selector later reduces them.
- Bundle hashes and workspace confinement detect ordinary artifact changes; they are not signatures or protection against a malicious local user able to rewrite both model and registry. Joblib models are trusted-code artifacts. Only plugin-created registered bundles are loaded.
- Source and data paths must resolve inside configured boundaries; outputs stay in the analysis workspace. This is local path validation, not OS isolation against concurrent filesystem mutation. DSH's active tool permission policy still applies.
- Cancellation uses the Harness-managed process range and waits for cleanup. GB's completed checkpoints are preserved; partial runs are not presented as completed analysis. Harness shutdown interrupts work; restart does not keep a job alive. Resume within the original session by submitting the same plan. No daemon is installed.
- `CV_*` orders the declared candidate library. `Val_*` is same-source internal holdout, not used for ranking. The first-ranked candidate is not proof of universal superiority or an unbiased evaluation of the whole selection process. See [GB evaluation methods](https://github.com/Wyplayground/Grand-Banquet_Chemometrics-tool/blob/main/Evaluation%20methods.md).
- The adapter uses GB private CV helpers for fold preflight, which is why the GB source revision is pinned.

## Development and verification

```powershell
npm ci --ignore-scripts
python scripts/setup_gb.py
python -m pip install --require-hashes --only-binary=:all: -r requirements.lock
python -m pip check
python python/dependency_policy.py
npm test
python -m unittest discover -s tests -p test_*.py -v
npm run build:client
npm pack --ignore-scripts
```

Python integration tests generate synthetic data and compare both classification/regression metrics against direct calls to the same GB engine; they also check checkpoint resume, data changes, invalid paths and session isolation. Synthetic tests are software validation, not evidence of scientific performance.

Workbench tests exercise arbitrary/duplicate column names, Excel sheet selection, import freshness, read-only source preservation, both tasks' export/prediction equality, feature reordering, missing features, foreign model IDs and modified model artifacts. A real Harness subprocess test runs the workbench without a live conversation or global job controller. The checked-in browser contract is tested against the host contract, and CI rejects stale generated browser code.

The native runtime test uses DSH's actual local subprocess provider, cancels a multi-process analysis, verifies process-range cleanup, then resumes its checkpoints. Local checks passed on Windows with Python 3.13 and DSH 0.2.2-rc.1. Real model-driven classification and regression workflows were also exercised through the Harness Web UI on 2026-11-06: inspection, displayed plans, background jobs, result reading, native file cards, CSV previews and PNG previews worked. HTML file cards were delivered, but the HTML sidebar preview remained blank in the tested in-app browser. The first generic Windows shell call also encountered a host ACL error; GB tools worked and the regression workflow completed without shell calls. See the [UI validation record](docs/UI_VALIDATION_2026-11-06.md) for the exact scope and remaining issues.

`.github/workflows/test.yml` runs six combinations: Windows, Linux and macOS with Python 3.10 and 3.13, including a fresh private installation. See [Actions](https://github.com/Wyplayground/dsh-gb/actions) for each commit's actual result; local UI evidence is Windows-only. Python 3.11/3.12 are accepted by the lock and installer but are not separate CI matrix entries. Dependency updates are explicit maintainer changes through `scripts/lock_dependencies.py`; ordinary installation never regenerates the lock.

Apache-2.0; see LICENSE. GB remains a separate Apache-2.0 project at the pinned upstream revision. DSH is a separate MIT-licensed host. Test outputs, environments, credentials and scientific datasets are excluded from this repository.
