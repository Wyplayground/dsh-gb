# Local MCP access

The stdio adapter exposes the same GB worker as the Harness plugin, with separate storage under `<workspace>/.dsh-gb/mcp-<scope>/`. It opens no HTTP port, accepts no model API key and provides no arbitrary shell/Python execution. A host-independent MCP client can inspect metadata, map columns, review a plan, start/stop a background analysis, read results, export a registered model and predict.

## Install and launch

Use a checkout of this release and its locked Node dependencies:

```powershell
git clone https://github.com/Wyplayground/dsh-gb.git
cd dsh-gb
git checkout v0.3.0-alpha.1
npm ci --ignore-scripts
python scripts/install.py --workspace "D:/GB-analysis" --install-deps
```

Read the installer output for the actual Python, GB and workspace paths. Configure the MCP application's stdio server with absolute paths, for example:

```json
{
  "mcpServers": {
    "gb": {
      "command": "node",
      "args": [
        "D:/tools/dsh-gb/mcp.js",
        "--python", "D:/GB-analysis/.dsh-gb/runtime/venv/Scripts/python.exe",
        "--gb-root", "D:/GB-analysis/.dsh-gb/runtime/gb",
        "--workspace", "D:/GB-analysis",
        "--scope", "research"
      ]
    }
  }
}
```

On Linux/macOS the private Python path ends in `venv/bin/python`. The configuration wrapper varies by MCP application. This example is a generic stdio configuration, not a claim that every application uses `mcpServers`. Different scope names keep plans/models separate. Restarting the MCP server interrupts live analyses; resubmit the same compatible plan to resume checkpoints.

The standalone adapter needs DSH's local subprocess provider and Cordis runtime. They are supplied by this checkout's locked development dependencies. The local subprocess provider is an optional peer of the plugin, so installing the ordinary Harness plugin does not install a second native subprocess runtime. Installing only the plugin tarball is not the documented standalone MCP setup. Keep dependency build scripts disabled; the tested process-management path does not need node-pty/koffi rebuilds.

## Tools and resources

The server provides 13 tools: `gb_list_data`, `gb_inspect_columns`, `gb_prepare_data`, `gb_inspect_data`, `gb_plan_analysis`, `gb_run_analysis`, `gb_read_results`, `gb_export_model`, `gb_predict`, `gb_environment`, `gb_list_models`, `gb_job_status` and `gb_cancel_job`.

Call `gb_environment` first. Use the metadata/mapping tools before creating a plan when columns differ from GB's expected names. `gb_plan_analysis` accepts `library: "full"` for all 990 candidates; omit explicit method lists in that mode. Custom plans are limited to 32. Review the returned immutable plan before `gb_run_analysis`. Poll its returned `jobId` using `gb_job_status`; process completion can still contain individual scientific failures, which must be read from `gb_read_results`.

Results are paged with `candidate_offset` and `candidate_limit` (at most 100 per MCP call). The total is explicit. Generated files are returned as scoped `gb://artifact/{kind}/{id}/{name}` resource URIs. Read resources at those exact returned URIs; each response is capped at 8 MiB. Export/prediction accept only registered models in the same MCP scope. A model resource is a trusted-code artifact for local retention, not permission to load arbitrary joblib files from elsewhere.

## Verified interoperability

The official MCP client 2.4.0 integration test completes mapping, planning, background execution, results, resources, model export and prediction. A second test connects using the MCP client 2.2.0 bundled with the targeted Harness release and checks tool discovery and environment status. This establishes stdio interoperability; configuring the server inside every third-party MCP application remains application-specific.
