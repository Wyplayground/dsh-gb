import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../index.js';
import { scopeFor, parseEvents } from '../bridge.js';
import { Context } from '@deepseek-ai/cordis';
import { ToolsService } from '@deepseek-ai/dsh-tools';

test('real Harness registry accepts all schemas and exposes the four model tools', async () => {
  const ctx = new Context();
  ctx.provide('systemPrompt', { tools() {} });
  const fiber = ctx.plugin(ToolsService);
  await fiber.await();
  try {
    apply(ctx);
    assert.equal(ctx.tools.schemas().filter(x => x.name.startsWith('gb_')).length, 4);
  } finally { await fiber.dispose(); }
});

test('registers four tools using the real DSH defineTool implementation', () => {
  const definitions = [];
  apply({ tools: { register: d => definitions.push(d) } });
  assert.deepEqual(definitions.map(x => x.name).sort(), ['gb_inspect_data', 'gb_plan_analysis', 'gb_read_results', 'gb_run_analysis']);
  for (const d of definitions) assert.equal(typeof d.execute, 'function');
});
test('requires session ownership and configuration before dispatch', async () => {
  assert.throws(() => scopeFor(null));
  assert.notEqual(scopeFor({ id: 'a' }), scopeFor({ id: 'b' }));
  const definitions = [];
  apply({ tools: { register: d => definitions.push(d) } });
  await assert.rejects(definitions[0].execute({ task: 'regression', path: 'x.csv' }, { signal: new AbortController().signal, agent: { id: 'a' } }), /Configure/);
});
test('protocol rejects malformed JSON', () => {
  assert.deepEqual(parseEvents('{"event":"progress"}\n'), [{event:'progress'}]);
  assert.throws(() => parseEvents('unstructured log'));
});
