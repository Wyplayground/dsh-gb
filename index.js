import { defineTool } from '@deepseek-ai/dsh-tools';
import { settings, scopeFor, startWorker, markInterrupted } from './bridge.js';

export const name = 'gb';
export const inject = ['tools', 'subprocess', 'jobs'];
const text = description => ({ type: 'string', required: true, description });
const task = { type: 'string', required: true, enum: ['classification', 'regression'] };
const planId = { plan_id: text('Plan identifier returned by gb_plan_analysis in this session.') };
const selection = { task, path: text('CSV/Excel path within the configured workspace.') };
const output = {
  schema: { type: 'json' },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
};

export function apply(ctx, config = {}) {
  const call = async (op, args, exec) => {
    const conf = await settings(config);
    const { done } = await startWorker(ctx, conf, scopeFor(exec.agent), op, args, exec.signal);
    return done;
  };
  const register = (name, description, parameters, execute) => ctx.tools.register(defineTool({ name, description, parameters, output, execute }));
  register('gb_inspect_data', 'Start here for GB analysis. Check a workspace-relative or absolute dataset path directly; returns environment readiness, dataset metadata and supported methods. No shell, pwd, directory glob or raw-matrix read is needed.', selection,
    (args, exec) => call('inspect', args, exec));
  register('gb_plan_analysis', 'Create a reproducible GB plan. Show the returned settings to the user before execution. Alpha: at most 32 candidates and 4 workers.', {
    ...selection,
    mode: { type: 'string', enum: ['exploration', 'standard', 'audit'] },
    ...Object.fromEntries(['preprocessing', 'selectors', 'models'].map(k => [k, { type: 'array', items: { type: 'string' } }])),
    ...Object.fromEntries(['outer_folds', 'inner_folds', 'seed', 'jobs'].map(k => [k, { type: 'integer' }])),
    validation_ratio: { type: 'number' },
  }, (args, exec) => call('plan', args, exec));
  register('gb_read_results', 'Read saved GB status, bounded evidence, all result/plot paths and a presentation manifest. Present presentation.default_files (Markdown summary, CSV, diagnostic PNG) with the native present tool. No shell or glob is needed. HTML is supplementary. CV ordering is not proof of a universally best pipeline; Val_* is internal holdout.', planId,
    async (args, exec) => {
      const value = await call('results', args, exec);
      const live = ctx.jobs.list(exec.agent.id).some(j => j.label === 'GB analysis ' + args.plan_id && ['running', 'stopping'].includes(j.status));
      if (value.state.status === 'running' && !live) value.state = { ...value.state, status: 'interrupted', resumable: true };
      return value;
    });
  register('gb_run_analysis', 'Execute a previously reviewed GB plan, or resume the same interrupted plan. Returns a background job ID: use job_output/job_list/job_kill. Restart interrupts running jobs.', planId,
    async (args, exec) => {
      exec.signal.throwIfAborted();
      const conf = await settings(config), scope = scopeFor(exec.agent);
      exec.signal.throwIfAborted();
      if (ctx.jobs.list(exec.agent.id).some(j => j.label === 'GB analysis ' + args.plan_id && ['running', 'stopping'].includes(j.status))) throw new Error('This plan is already running in this session.');
      const id = ctx.jobs.start({
        kind: 'gb', label: 'GB analysis ' + args.plan_id, owner: exec.agent.id,
        toolCall: { callId: exec.callId, rootCallId: exec.rootCallId }, outputLimitBytes: 12000,
        run(job) {
          const controller = new AbortController();
          const done = (async () => {
            try {
              const worker = await startWorker(ctx, conf, scope, 'run', args, controller.signal, event => {
                if (event.event === 'progress') job.updateProgress(`${event.completed}/${event.total} candidates`);
              });
              const result = await worker.done;
              return { status: 'completed', result: JSON.stringify(result), detail: result.state.status };
            } catch (error) {
              if (error.cleanupFailed) return { status: 'failed', detail: 'Process cleanup could not be verified: ' + error.message };
              if (controller.signal.aborted) {
                try { await markInterrupted(conf, scope, args.plan_id); }
                catch (cleanup) { return { status: 'failed', detail: 'Could not record cancellation: ' + cleanup.message }; }
                return { status: 'killed', detail: 'Interrupted; rerun the same plan to resume completed checkpoints.' };
              }
              return { status: 'failed', detail: error.message };
            }
          })();
          return { done, cancel: () => controller.abort() };
        },
      });
      return { jobId: id, plan_id: args.plan_id };
    });
  // A preset using the GB policy must wait until these global tools exist.
  ctx.provide('gbConfiguration', config);
}
