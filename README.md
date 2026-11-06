# dsh-gb

Grand Banquet chemometrics tools for DeepSeek Harness. Alpha **0.1.0-alpha.2** targeting **DSH 0.2.2-rc.1**.

This release adds the optional **GB 分析** mode and defaults to a generated Markdown summary, CSV table and diagnostic PNG. See [Alpha.2 changes and limits](docs/ALPHA2_CHANGES.md).

This independent plugin wraps the existing GB Python engine. It does not replace its scientific methods or require a second DeepSeek API key. Raw data stays in the configured local workspace; model-facing results contain metadata and bounded result summaries. Harness receives the tool arguments, paths, settings and summaries, so these are part of the conversation context.

## Setup

Requirements: Node.js compatible with DSH, Git, Python 3.10–3.13, and a working DSH web profile with `tools`, `subprocess`, `jobs` and job-control tools. Windows is the initial development platform. The plugin refuses to run until paths are configured.

```powershell
git clone https://github.com/Wyplayground/dsh-gb.git
cd dsh-gb
npm install --ignore-scripts
python scripts/setup_gb.py
python -m pip install -r .runtime/gb/requirements.txt
dsh plugin --profile web add ./
```

Choose the Python interpreter that owns the scientific dependencies. All commands above that say `python` must use that interpreter. Setup fetches the exact GB commit in `gb.lock.json`; GB has no pip-installable package metadata, so the plugin takes a source checkout path.

In the web profile's user `cordis.patch.yml`, override the `gb` row with the following configuration (replace all example paths):

```yaml
- id: gb
  config:
    pythonPath: 'C:/path/to/python.exe'
    gbRoot: 'D:/path/to/dsh-gb/.runtime/gb'
    workspaceRoot: 'D:/path/to/your-analysis-workspace'
```

See the official [profile patch documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md). Inspect the effective configuration with `dsh --profile web --dump-config`, then launch `dsh web`. Use the same profile for installation and launch. Desktop users must use Desktop's own plugin manager / bundled CLI and configure its profile separately.

No TypeScript build or installation-time code execution is required: entry points are plain JavaScript. After this repository is published, a pinned GitHub install can use `dsh plugin --profile web add github:Wyplayground/dsh-gb#<commit>`; Python/GB setup and profile configuration remain separate steps.

## Tools and example workflow

Before sending the first message in a new session, select **GB 分析** from the mode menu. This optional preset exposes the four GB tools, `job_output`, `job_list`, `job_kill` and `present`; shell execution, arbitrary file reads/searches and code generation tools are not exposed. The standard preset and its tools are unchanged. Existing conversations keep their preset: start a new GB session after installing/updating this bundle. This is a capability restriction, not an OS sandbox or a repair to the host's general Windows shell.

1. `gb_inspect_data`: inspect local CSV/XLS/XLSX metadata, file readiness, output writability, configured workspace, Python/dependency versions and supported methods. No shell directory probe or raw-matrix read is necessary. Feature-name previews are bounded to 16 names; sample identifiers and raw feature rows are not returned. GB requires `Sample name` and `Class` (classification) or `Target` (regression), numeric feature columns, optional `Group` and `Split`. GB drops missing/non-numeric targets; the returned sample count is after filtering.
2. `gb_plan_analysis`: validate settings, check fold construction, record data/source fingerprints, and return `plan_id`. Defaults: exploration, Raw, no variable selection, PLS model, 3 outer folds, 2 inner folds, seed 42, 1 worker. Explicit Group/Split assignments are retained by GB.
3. Show the plan in the conversation, then `gb_run_analysis` with that `plan_id`. It returns a DSH job ID. Read/wait/stop using native `job_output`, `job_list`, `job_kill`.
4. `gb_read_results` returns saved state, bounded metrics, root artifact paths and an explicit PNG plot index. It writes `gb_summary.md` and returns `presentation.default_files`: the Markdown summary, CSV leaderboard and task-specific diagnostic PNG. The model passes these exact paths to native `present`, so it needs no extra glob or handwritten Windows-path Markdown links. Open the cards in the sidebar to view the summary, spreadsheet and plot. GB's HTML leaderboard remains a supplementary file; the default view does not depend on its iframe renderer. Artifact indexes cap root files at 128 and plots at 64 and report truncation explicitly.

Example prompt in **GB 分析**: “Inspect classification.csv using GB. Propose a small exploration plan with Raw preprocessing, no selection and PLS-DA. Show the plan, run it, and display the summary, result table and diagnostic plot. Explain CV/internal-holdout differences and any failures.”

Plans and runs are stored under `<workspaceRoot>/.dsh-gb/<session-hash>/`. The same plan ID is scoped to its creating session. Changing data or scientific source after planning blocks execution. Re-running an unchanged plan uses GB's checkpoints. Plugin state and native jobs are distinct: a completed job can contain scientific pipeline or export failures, which are reported as `completed_with_errors`.

## Alpha boundaries

- At most 32 candidates and 1–4 workers per plan. Full 990-candidate workflows, prediction, a custom interactive result panel and MCP are deferred. Default result presentation uses existing native Markdown/CSV/PNG viewers.
- Source and data paths must resolve inside configured boundaries; outputs stay in the analysis workspace. This is local path validation, not OS isolation against concurrent filesystem mutation. DSH's active tool permission policy still applies.
- Cancellation uses the Harness-managed process range and waits for cleanup. GB's completed checkpoints are preserved; partial runs are not presented as completed analysis. Harness shutdown interrupts work; restart does not keep a job alive. Resume within the original session by submitting the same plan. No daemon is installed.
- `CV_*` orders the declared candidate library. `Val_*` is same-source internal holdout, not used for ranking. The first-ranked candidate is not proof of universal superiority or an unbiased evaluation of the whole selection process. See [GB evaluation methods](https://github.com/Wyplayground/Grand-Banquet_Chemometrics-tool/blob/main/Evaluation%20methods.md).
- The adapter uses GB private CV helpers for fold preflight, which is why the GB source revision is pinned.

## Development and verification

```powershell
npm ci --ignore-scripts
python scripts/setup_gb.py
python -m pip install -r .runtime/gb/requirements.txt
npm test
python -m unittest discover -s tests -p test_*.py -v
npm pack --ignore-scripts
```

Python integration tests generate synthetic data and compare both classification/regression metrics against direct calls to the same GB engine; they also check checkpoint resume, data changes, invalid paths and session isolation. Synthetic tests are software validation, not evidence of scientific performance.

The native runtime test uses DSH's actual local subprocess provider, cancels a multi-process analysis, verifies process-range cleanup, then resumes its checkpoints. Local checks passed on Windows with Python 3.13 and DSH 0.2.2-rc.1. Real model-driven classification and regression workflows were also exercised through the Harness Web UI on 2026-11-06: inspection, displayed plans, background jobs, result reading, native file cards, CSV previews and PNG previews worked. HTML file cards were delivered, but the HTML sidebar preview remained blank in the tested in-app browser. The first generic Windows shell call also encountered a host ACL error; GB tools worked and the regression workflow completed without shell calls. See the [UI validation record](docs/UI_VALIDATION_2026-11-06.md) for the exact scope and remaining issues.

`.github/workflows/test.yml` runs the plugin and Python integration checks on Windows and Linux. See the repository's Actions tab for the result of each commit; local Windows verification and remote CI results are separate evidence.

Apache-2.0; see LICENSE. GB remains a separate Apache-2.0 project at the pinned upstream revision. DSH is a separate MIT-licensed host. Test outputs, environments, credentials and scientific datasets are excluded from this repository.
