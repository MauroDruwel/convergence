import { Hono } from 'hono';
import { RepoBrain } from './durable-objects/RepoBrain.js';
import { HeadToHeadBenchmark } from './benchmarks/comparator.js';
import { ConvEngine } from './cli/conv-engine.js';
import { parseSourceToSymbols } from './core/ast-engine.js';
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

export interface RepoMetadata {
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

const repoRegistry = new Map<string, RepoMetadata>([
  [
    'convergence-core',
    {
      name: 'convergence-core',
      owner: 'mauro-druwel',
      description: 'Autonomous Continuous Semantic Code Fabric for Cloudflare Challenge',
      stars: 128,
      forks: 14,
      default_branch: 'main',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
]);

// In-memory fallback brains for local execution
const localBrains = new Map<string, RepoBrain>();

export function getLocalBrain(env?: Env, repoKey: string = 'convergence-core'): RepoBrain {
  const normalizedKey = repoKey || 'convergence-core';
  if (!localBrains.has(normalizedKey)) {
    const brain = new RepoBrain(undefined, env);
    brain.setRepoName(normalizedKey);
    localBrains.set(normalizedKey, brain);
    if (!repoRegistry.has(normalizedKey)) {
      repoRegistry.set(normalizedKey, {
        name: normalizedKey,
        owner: 'mauro-druwel',
        description: `Edge AST-CRDT Autonomous Repository (${normalizedKey})`,
        stars: 1,
        forks: 0,
        default_branch: 'main',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  return localBrains.get(normalizedKey)!;
}

export function getRepoBrain(c: any, repoKey?: string): RepoBrain | any {
  const key = repoKey || 'convergence-core';
  if (c.env?.REPO_BRAIN) {
    const id = c.env.REPO_BRAIN.idFromName(key);
    return c.env.REPO_BRAIN.get(id);
  }
  return getLocalBrain(c.env, key);
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
  const repoName = c.req.query('repo') || 'convergence-core';
  const brain = getRepoBrain(c, repoName);
  return c.json(await brain.getState());
});

/**
 * Accepts an agent commit
 */
app.post('/api/commit', async (c) => {
  const body = await c.req.json();
  const repoName = body.repoName || body.repo || 'convergence-core';
  const brain = getRepoBrain(c, repoName);
  const res = await brain.handleAgentCommit(body);
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
 * Edit-Time Coordination: Release Symbol Lease
 */
app.post('/api/leases/release', async (c) => {
  const { symbolId, agentId } = await c.req.json();
  const brain = c.env?.REPO_BRAIN
    ? (c.env.REPO_BRAIN.get(c.env.REPO_BRAIN.idFromName('main-repo')) as any)
    : getLocalBrain(c.env);

  const ok = brain.releaseSymbolLease(symbolId, agentId);
  return c.json({ success: ok, symbolId });
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

/**
 * Interactive Convergence CLI Endpoint
 * Executes `conv` commands against the Durable Object RepoBrain.
 */
app.post('/api/cli', async (c) => {
  const { command, agentId, repo } = await c.req.json();
  const rawTokens = (command || '').trim().split(/\s+/);
  let targetRepo = repo;

  // Auto-route repository for conv clone, conv init, or --repo
  if (!targetRepo && rawTokens[0] === 'conv') {
    if ((rawTokens[1] === 'clone' || rawTokens[1] === 'init') && rawTokens[2] && !rawTokens[2].startsWith('-')) {
      targetRepo = rawTokens[2];
    }
  }
  const repoIdx = rawTokens.indexOf('--repo');
  if (repoIdx !== -1 && rawTokens[repoIdx + 1]) {
    targetRepo = rawTokens[repoIdx + 1];
  }

  const repoName = targetRepo || 'convergence-core';
  const brain = getRepoBrain(c, repoName);
  const engine = new ConvEngine(brain);
  const result = await engine.execute(command || 'conv status', agentId || 'claude_local', repoName);
  return c.json(result);
});

/**
 * Symbol extraction endpoint
 */
app.get('/api/symbols', async (c) => {
  const filename = c.req.query('file') || c.req.query('filename') || 'index.ts';
  const repoName = c.req.query('repo') || 'convergence-core';
  const brain = getRepoBrain(c, repoName);
  const state = await brain.getState();
  const content = state.files[filename] || '';
  const parsed = parseSourceToSymbols(filename, content);
  return c.json({
    filename,
    symbols: Array.from(parsed.symbols.values()),
    count: parsed.symbols.size,
  });
});

/**
 * Repository Management Endpoints
 */
app.get('/api/repos', (c) => c.json(Array.from(repoRegistry.values())));
app.get('/api/v1/user/repos', (c) => c.json(Array.from(repoRegistry.values())));

async function handleCreateRepo(c: any) {
  const body = await c.req.json().catch(() => ({}));
  const rawName = body.name || body.repo || `repo_${Date.now().toString(36)}`;
  const name = rawName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const description = body.description || 'Autonomous Edge Code Repository on Convergence';
  const owner = body.owner || 'mauro-druwel';

  const meta: RepoMetadata = {
    name,
    owner,
    description,
    stars: 1,
    forks: 0,
    default_branch: 'main',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  repoRegistry.set(name, meta);

  const brain = getRepoBrain(c, name);
  if (brain.initCustomRepo) {
    brain.initCustomRepo(name, description);
  } else if (c.env?.REPO_BRAIN) {
    try {
      await brain.initCustomRepo?.(name, description);
    } catch {}
  }

  return c.json(
    {
      id: Date.now(),
      name,
      full_name: `${owner}/${name}`,
      owner: { login: owner, id: 1 },
      html_url: `https://convergence.edge/${owner}/${name}`,
      description,
      default_branch: 'main',
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      clone_url: `conv clone ${name}`,
    },
    201
  );
}

app.post('/api/repos', handleCreateRepo);
app.post('/api/v1/user/repos', handleCreateRepo);

/**
 * GitHub-Compatible REST API: Repository Metadata
 */
app.get('/api/v1/repos/:owner/:repo', async (c) => {
  const owner = c.req.param('owner');
  const repoName = c.req.param('repo');
  const brain = getRepoBrain(c, repoName);
  const state = await brain.getState();
  const meta = repoRegistry.get(repoName) || {
    name: repoName,
    owner,
    description: 'Next-Gen Autonomous Edge Git Platform — Built on Cloudflare Workers & Durable Objects',
    stars: 1,
    forks: 0,
    default_branch: 'main',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return c.json({
    id: 10001,
    name: repoName,
    full_name: `${owner}/${repoName}`,
    private: false,
    default_branch: 'main',
    description: meta.description,
    html_url: `https://convergence.edge/${owner}/${repoName}`,
    clone_url: `http://localhost:3000/${repoName}.git`,
    lamport_clock: state.lamportClock,
    active_leases_count: Array.isArray(state.activeLeases) ? state.activeLeases.length : Object.keys(state.activeLeases || {}).length,
    open_issues_count: 0,
    watchers_count: 8,
    forks_count: meta.forks || 1,
    subscribers_count: 8,
  });
});

app.get('/api/repos/:owner/:repo', async (c) => {
  return c.redirect(`/api/v1/repos/${c.req.param('owner')}/${c.req.param('repo')}`);
});

/**
 * GitHub-Compatible REST API: Contents (List files or get file)
 */
app.get('/api/v1/repos/:owner/:repo/contents', async (c) => {
  const brain = getRepoBrain(c, c.req.param('repo'));
  const state = await brain.getState();
  const files = Object.keys(state.files || {}).map((filename) => {
    const content = state.files[filename] || '';
    return {
      name: filename,
      path: filename,
      sha: `sha_${Buffer.from(filename).toString('hex').slice(0, 10)}`,
      size: Buffer.byteLength(content, 'utf8'),
      type: 'file',
      download_url: `/raw/${filename}`,
    };
  });
  return c.json(files);
});

app.get('/api/v1/repos/:owner/:repo/contents/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const brain = getRepoBrain(c, c.req.param('repo'));
  const state = await brain.getState();
  const content = state.files[path];
  if (content === undefined) {
    return c.json({ message: `Not Found: ${path}` }, 404);
  }

  return c.json({
    name: path,
    path: path,
    sha: `sha_${Buffer.from(path).toString('hex').slice(0, 10)}`,
    size: Buffer.byteLength(content, 'utf8'),
    encoding: 'base64',
    content: Buffer.from(content, 'utf8').toString('base64'),
    type: 'file',
    download_url: `/raw/${path}`,
  });
});

/**
 * GitHub-Compatible REST API: Create or update file (commits code)
 */
app.put('/api/v1/repos/:owner/:repo/contents/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const body = await c.req.json();
  const brain = getRepoBrain(c, c.req.param('repo'));

  let rawContent = body.content || '';
  if (body.encoding === 'base64') {
    rawContent = Buffer.from(rawContent, 'base64').toString('utf8');
  }

  const author = body.author?.name || body.committer?.name || 'claude_architect';
  const message = body.message || `chore: update ${path}`;

  const res = await brain.handleAgentCommit({
    agentId: author,
    filename: path,
    sourceCode: rawContent,
    message,
    promptIntent: message,
  });

  return c.json({
    content: {
      name: path,
      path: path,
      sha: res.commitId,
      size: Buffer.byteLength(rawContent, 'utf8'),
    },
    commit: {
      sha: res.commitId,
      message,
      cleanMerge: res.cleanMerge,
      author: { name: author },
    },
  });
});

/**
 * GitHub-Compatible REST API: Commits
 */
app.get('/api/v1/repos/:owner/:repo/commits', async (c) => {
  const brain = getRepoBrain(c, c.req.param('repo'));
  const state = await brain.getState();
  const provs = state.provenanceRecords || [];
  const events = (state.events || []).filter((e: any) => e.data?.commitId);

  const commits = provs.map((p: any) => {
    const matchingEvt = events.find((e: any) => e.data?.commitId === p.commitId);
    return {
      sha: p.commitId,
      commit: {
        author: { name: p.agentId, date: new Date(p.timestamp || Date.now()).toISOString() },
        message: matchingEvt?.data?.message || p.promptIntent || `commit ${p.commitId}`,
      },
      cleanMerges: 1,
      conflicts: 0,
      targetSymbol: p.symbolId,
      reasoningChain: p.reasoningChain,
      lamport: state.lamportClock,
    };
  });
  return c.json(commits);
});

/**
 * GitHub-Compatible REST API: Pull Requests / Reverse PRs
 */
app.get('/api/v1/repos/:owner/:repo/pulls', async (c) => {
  const brain = getRepoBrain(c, c.req.param('repo'));
  const state = await brain.getState();
  return c.json(state.reversePullRequests || []);
});

app.post('/api/v1/repos/:owner/:repo/pulls', async (c) => {
  const { title, body, options, agentId } = await c.req.json();
  const brain = getRepoBrain(c, c.req.param('repo'));

  const pr = brain.createReversePR(
    agentId || 'claude_architect',
    title || body || 'Architectural steering inquiry',
    options || ['Accept Proposed Implementation', 'Reject with Constraint', 'Alternative Approach']
  );
  return c.json(pr, 201);
});

/**
 * Raw File Serving
 */
app.get('/raw/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const repoName = c.req.query('repo') || 'convergence-core';
  const brain = getRepoBrain(c, repoName);

  const state = await brain.getState();
  const content = state.files[path];
  if (content === undefined) return c.text(`File not found: ${path}`, 404);
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(content);
});

app.get('/:owner/:repo/raw/main/:path{.+}', async (c) => {
  const repoName = c.req.param('repo');
  const path = c.req.param('path');
  const brain = getRepoBrain(c, repoName);
  const state = await brain.getState();
  const content = state.files[path];
  if (content === undefined) return c.text(`File not found: ${path}`, 404);
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(content);
});

export default app;
