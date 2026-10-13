import { Hono } from 'hono';
import { RepoBrain } from './durable-objects/RepoBrain.js';
import { HeadToHeadBenchmark } from './benchmarks/comparator.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export { RepoBrain };

export interface Env {
  REPO_BRAIN: DurableObjectNamespace;
  ARTIFACTS?: any;
  AI?: any;
}

const app = new Hono<{ Bindings: Env }>();

function getDashboardHtml(): string {
  try {
    return readFileSync(join(process.cwd(), 'src', 'ui', 'dashboard.html'), 'utf-8');
  } catch {
    return '<h1>Convergence Dashboard Active</h1>';
  }
}

// In-memory fallback brain for local Node server execution
let localBrain: RepoBrain | null = null;
export function getLocalBrain(env?: Env): RepoBrain {
  if (!localBrain) {
    localBrain = new RepoBrain(undefined, env);
  }
  return localBrain;
}

/**
 * Serves the interactive Swarm Dashboard
 */
app.get('/', (c) => {
  return c.html(getDashboardHtml());
});

/**
 * Returns current snapshot of repository state
 */
app.get('/api/state', async (c) => {
  if (c.env?.REPO_BRAIN) {
    const id = c.env.REPO_BRAIN.idFromName('main-repo');
    const stub = c.env.REPO_BRAIN.get(id) as any;
    return c.json(await stub.getState());
  }
  return c.json(getLocalBrain(c.env).getState());
});

/**
 * Accepts an agent commit
 */
app.post('/api/commit', async (c) => {
  const body = await c.req.json();
  if (c.env?.REPO_BRAIN) {
    const id = c.env.REPO_BRAIN.idFromName('main-repo');
    const stub = c.env.REPO_BRAIN.get(id) as any;
    const res = await stub.handleAgentCommit(body);
    return c.json(res);
  }
  const res = await getLocalBrain(c.env).handleAgentCommit(body);
  return c.json(res);
});

/**
 * Triggers a wave of 8 concurrent simulated agents
 */
app.post('/api/swarm', async (c) => {
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const waveId = Date.now().toString(36).slice(-4);
  // Each agent contributes a real, role-appropriate symbol (names keep the
  // module_ prefix so live dashboards can trace swarm output in mainline).
  const wave: Array<{ name: string; symbol: string; message: string; snippet: string }> = [
    {
      name: 'agent_sentinel',
      symbol: `module_sentinel_rateLimit_${waveId}`,
      message: `Agent agent_sentinel adds per-merchant rate limiter`,
      snippet: `\n// Added by agent_sentinel: per-merchant leaky-bucket guard\nconst rateHits_${waveId}: number[] = [];\nexport function module_sentinel_rateLimit_${waveId}(now: number = Date.now()): boolean {\n  while (rateHits_${waveId}.length > 0 && now - rateHits_${waveId}[0] > 60000) rateHits_${waveId}.shift();\n  if (rateHits_${waveId}.length >= 120) return false;\n  rateHits_${waveId}.push(now);\n  return true;\n}\n`,
    },
    {
      name: 'agent_payment',
      symbol: `module_payment_idempotency_${waveId}`,
      message: `Agent agent_payment adds idempotency-key dedupe`,
      snippet: `\n// Added by agent_payment: idempotency-key dedupe so retries never double-charge\nconst seenKeys_${waveId}: Record<string, string> = {};\nexport function module_payment_idempotency_${waveId}(orderId: string, idempotencyKey: string): string {\n  if (seenKeys_${waveId}[idempotencyKey]) return seenKeys_${waveId}[idempotencyKey];\n  const txId = "tx_" + idempotencyKey.slice(0, 12) + "_" + orderId.slice(0, 8);\n  seenKeys_${waveId}[idempotencyKey] = txId;\n  return txId;\n}\n`,
    },
    {
      name: 'agent_auth',
      symbol: `module_auth_verifyToken_${waveId}`,
      message: `Agent agent_auth adds structural JWT verification`,
      snippet: `\n// Added by agent_auth: structural JWT verification (shape + expiry, no network)\nexport function module_auth_verifyToken_${waveId}(jwt: string, nowSec: number = Math.floor(Date.now() / 1000)): boolean {\n  const parts = jwt.split(".");\n  if (parts.length !== 3) return false;\n  try {\n    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));\n    if (typeof payload.exp === "number" && payload.exp < nowSec) return false;\n    return typeof payload.sub === "string" && payload.sub.length > 0;\n  } catch {\n    return false;\n  }\n}\n`,
    },
    {
      name: 'agent_optimizer',
      symbol: `module_optimizer_batchSettle_${waveId}`,
      message: `Agent agent_optimizer adds batch settlement aggregation`,
      snippet: `\n// Added by agent_optimizer: batch settlement aggregates captures into one payout\nexport function module_optimizer_batchSettle_${waveId}(amounts: number[]): { count: number; total: number; fee: number } {\n  const total = amounts.reduce((sum, a) => sum + (a > 0 ? a : 0), 0);\n  const fee = Math.round(total * 0.029 * 100) / 100 + 0.3 * amounts.length;\n  return { count: amounts.length, total: Math.round((total - fee) * 100) / 100, fee: Math.round(fee * 100) / 100 };\n}\n`,
    },
    {
      name: 'agent_fuzzer',
      symbol: `module_fuzzer_clampAmount_${waveId}`,
      message: `Agent agent_fuzzer adds boundary sanitizer from fuzz findings`,
      snippet: `\n// Added by agent_fuzzer: boundary sanitizer distilled from fuzz findings\n// (fuzz corpus: -99999, 0, NaN, "1999", 1e12 — all must collapse to safe values)\nexport function module_fuzzer_clampAmount_${waveId}(raw: unknown): number {\n  const n = typeof raw === "string" ? Number(raw) : (raw as number);\n  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0;\n  return Math.min(n, 1000000);\n}\n`,
    },
    {
      name: 'agent_refactor',
      symbol: `module_refactor_moneyFormat_${waveId}`,
      message: `Agent agent_refactor adds locale-aware money formatting`,
      snippet: `\n// Added by agent_refactor: locale-aware money formatting for receipts\nexport function module_refactor_moneyFormat_${waveId}(amount: number, currency: string = CONFIG.currency): string {\n  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);\n}\n`,
    },
    {
      name: 'agent_docs',
      symbol: `module_docs_describeError_${waveId}`,
      message: `Agent agent_docs adds typed error catalog`,
      snippet: `\n// Added by agent_docs: typed error catalog so agents raise consistent failures\nexport const module_docs_errorCatalog_${waveId}: Record<string, string> = {\n  E_AUTH: "Missing or invalid customer token",\n  E_LIMIT: "Merchant rate limit exceeded",\n  E_FUNDS: "Amount failed boundary validation",\n};\nexport function module_docs_describeError_${waveId}(code: string): string {\n  return module_docs_errorCatalog_${waveId}[code] ?? "Unknown convergence error";\n}\n`,
    },
    {
      name: 'agent_tester',
      symbol: `module_tester_orderFixture_${waveId}`,
      message: `Agent agent_tester adds deterministic order fixture`,
      snippet: `\n// Added by agent_tester: deterministic order fixture for hermetic agent tests\nexport function module_tester_orderFixture_${waveId}(orderId: string): Transaction {\n  return { id: "tx_test_" + orderId, orderId, amount: 1999, currency: "USD", status: "pending" };\n}\n`,
    },
  ];

  const currentState = await brain.getState();
  const currentCode = currentState.files['index.ts'] || '';

  const results = await Promise.all(
    wave.map(async (w) => {
      return await brain.handleAgentCommit({
        agentId: w.name,
        filename: 'index.ts',
        sourceCode: currentCode + w.snippet,
        message: w.message,
      });
    })
  );

  return c.json({ success: true, waveId, resultsCount: results.length });
});

/**
 * Runs the Head-to-Head Benchmark against Traditional Git
 */
app.post('/api/benchmark', async (c) => {
  const bench = new HeadToHeadBenchmark();
  const metrics = await bench.runConvergenceBenchmark(25);
  return c.json(metrics);
});

/**
 * Resolves Reverse PR architectural inquiry
 */
app.post('/api/reverse-pr/resolve', async (c) => {
  const { prId, option } = await c.req.json();
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const ok = await brain.resolveReversePR(prId, option);
  return c.json({ success: ok });
});

/**
 * Triggers a test Reverse PR to simulate architectural steering
 */
app.post('/api/reverse-pr/trigger', async (c) => {
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const pr = brain.createReversePR(
    'agent_architect',
    'Database schema tradeoff: migrate to distributed SQLite (D1) or keep in-memory Durable Object state?',
    ['Migrate to D1 SQLite', 'Keep DO memory with write-ahead log', 'Hybrid cache tier']
  );
  return c.json({ success: true, pr });
});

/**
 * Chrono-Revert: Surgical rollback of a single symbol
 */
app.post('/api/revert', async (c) => {
  const { filename, symbolId } = await c.req.json();
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const res = await brain.chronoRevertSymbol(filename || 'index.ts', symbolId);
  return c.json(res);
});

/**
 * Simulates an adversarial red-team injection to showcase the Immune System
 */
app.post('/api/immune-attack', async (c) => {
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  // Commits a flawed function with missing boundary check to test the autonomous immune defense
  const res = await brain.handleAgentCommit({
    agentId: 'adversarial_fuzzer',
    filename: 'index.ts',
    sourceCode: `
export function transferFunds(amount: number): boolean {
  console.log("Transferring amount: " + amount);
  return true;
}
`,
    message: 'Adversarial probe: commit unvalidated financial transfer',
  });

  return c.json({ success: true, result: res });
});

/**
 * Edit-Time Coordination: Request Symbol Lease
 */
app.post('/api/leases/request', async (c) => {
  const { symbolId, agentId, leaseType, ttlMs, intent } = await c.req.json();
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const res = brain.requestSymbolLease(symbolId, agentId, leaseType, ttlMs, intent);
  return c.json(res);
});

/**
 * Provenance / Chain-of-Thought query
 */
app.get('/api/provenance', async (c) => {
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const state = await brain.getState();
  return c.json(state.provenanceRecords || []);
});

export default app;
