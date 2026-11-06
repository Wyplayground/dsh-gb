import { createHash } from 'node:crypto';
import { realpath, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const worker = fileURLToPath(new URL('./python/worker.py', import.meta.url));
export function scopeFor(agent) {
  if (!agent?.id) throw new Error('GB tools require an owning Harness session.');
  return createHash('sha256').update(String(agent.id)).digest('hex').slice(0, 24);
}
export async function settings(config) {
  if (!config.gbRoot || !config.workspaceRoot) throw new Error('Configure absolute gbRoot and workspaceRoot before using GB.');
  if (!isAbsolute(config.gbRoot) || !isAbsolute(config.workspaceRoot)) throw new Error('GB configuration paths must be absolute.');
  return { gbRoot: await realpath(config.gbRoot), workspaceRoot: await realpath(config.workspaceRoot), pythonPath: config.pythonPath || 'python' };
}
export function parseEvents(text) {
  return text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export async function startWorker(ctx, config, scope, op, args, signal, onEvent = () => {}) {
  signal?.throwIfAborted();
  const python = await ctx.subprocess.resolveExecutable(config.pythonPath);
  signal?.throwIfAborted();
  const child = ctx.subprocess.spawn({
    argv: [python, '-u', worker], cwd: config.workspaceRoot, graceMs: 1500, signal,
    env: { PYTHONIOENCODING: 'utf-8', MPLBACKEND: 'Agg', OMP_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1' },
    stdio: { stdin: { data: JSON.stringify({ ...config, scope, op, args }) }, stdout: 'pipe', stderr: { maxBytes: 65536 } },
  });
  let last, protocolError;
  const reading = (async () => {
    let buffer = '';
    child.stdout.setEncoding('utf8');
    for await (const chunk of child.stdout) {
      buffer += chunk;
      if (buffer.length > 2 * 1024 * 1024) throw new Error('Worker protocol exceeded size limit');
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.event === 'result') last = event.value;
        if (event.event === 'error') protocolError = new Error(event.message);
        onEvent(event);
      }
    }
    if (buffer.trim()) throw new Error('Incomplete worker protocol');
  })().catch(error => { protocolError = error; child.terminate(); });
  const done = (async () => {
    try {
      const outcome = await child.done;
      await reading;
      await child.waitForExit();
      signal?.throwIfAborted();
      if (protocolError) throw protocolError;
      if (outcome.exitCode !== 0 || last === undefined) throw new Error('GB worker failed: ' + (child.collected.stderr?.readFrom(0).text || outcome.exitCode));
      return last;
    } finally {
      child.terminate();
      try {
        if (!await child.waitForExit()) throw new Error('Process range is still active');
      } catch (error) { error.cleanupFailed = true; throw error; }
    }
  })();
  return { child, done };
}

export async function markInterrupted(config, scope, planId) {
  if (!/^[0-9a-f]{24}$/.test(planId)) return;
  const folder = await realpath(join(config.workspaceRoot, '.dsh-gb', scope, 'runs', planId)).catch(() => null);
  if (!folder) return;
  const rel = relative(config.workspaceRoot, folder);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Run path escapes workspace');
  const path = join(folder, 'state.json');
  const old = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'));
  const tmp = path + '.cancel.tmp';
  await writeFile(tmp, JSON.stringify({ ...old, status: 'interrupted', resumable: true }));
  await rename(tmp, path);
}
