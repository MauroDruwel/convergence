#!/usr/bin/env -S node --import=tsx
/**
 * ⚡ CONVERGENCE LIVE AI AGENT (`npm run agent:live`)
 *
 * A real autonomous MCP client that performs the full agent collaboration
 * loop against Convergence — locally (http://localhost:3000) or against the
 * deployed Cloudflare Worker:
 *
 *   1. Reads edge state (Lamport clock, Artifacts mode) via REST
 *   2. Handshakes over MCP (initialize -> tools/list) via POST /api/mcp
 *   3. Acquires an edit-time symbol lease BEFORE spending "tokens"
 *   4. A rival agent collides -> receives HTTP 423 backpressure (0 tokens wasted)
 *   5. Pushes a real TypeScript symbol via MCP (AST-CRDT graft, 0 conflicts)
 *   6. Verifies: symbol indexed, Git Notes Chain-of-Thought recorded
 *
 * Usage:
 *   npm run agent:live                          # vs localhost:3000
 *   CONVERGENCE_URL=https://convergence.<you>.workers.dev npm run agent:live
 *   LIVE_FAST=1 npm run agent:live              # no dramatic pauses (CI)
 */

const BASE = (process.env.CONVERGENCE_URL || 'http://localhost:3000').replace(/\/$/, '');
const REPO = process.env.CONV_REPO || 'convergence-core';
const AGENT = process.env.CONV_AGENT || 'agent_live_01';
const RIVAL = process.env.CONV_RIVAL || 'agent_live_02';
const SYMBOL = process.env.CONV_SYMBOL || 'func:verifyFraudScore';
const FILE = 'index.ts';
const FAST = process.env.LIVE_FAST === '1';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const sleep = (ms: number) => (FAST ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
const h = (t: string) => console.log(`\n${C.bold}${C.cyan}━━━ ${t} ${'━'.repeat(Math.max(4, 58 - t.length))}${C.reset}`);

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* plain text (SSE, raw file) */
  }
  return { status: res.status, ok: res.ok, json, text };
}

async function mcp(method: string, params: any = {}, id = 1) {
  const { status, json } = await api('/api/mcp', {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  if (status !== 200 || !json) throw new Error(`MCP ${method} failed (HTTP ${status})`);
  if (json.error) throw new Error(`MCP ${method} error: ${json.error.message}`);
  return json.result;
}

const mcpText = (result: any): string => result?.content?.[0]?.text ?? JSON.stringify(result);

const FRAUD_SNIPPET = `// Grafted by ${AGENT} via Cloudflare MCP — AST-CRDT commutative union
export interface FraudSignal {
  velocity: number;
  amount: number;
  countryMismatch: boolean;
}
export function verifyFraudScore(signal: FraudSignal): { score: number; block: boolean } {
  if (typeof signal.amount !== 'number' || !Number.isFinite(signal.amount) || signal.amount <= 0) {
    throw new RangeError('Invalid amount');
  }
  let score = 0;
  if (signal.amount > 10000) score += 40;
  if (signal.velocity > 5) score += 35;
  if (signal.countryMismatch) score += 25;
  return { score, block: score >= 50 };
}
`;

async function main() {
  console.log(`${C.bold}${C.magenta}⚡ CONVERGENCE LIVE AI AGENT${C.reset}`);
  console.log(`${C.dim}target: ${BASE}   repo: ${REPO}   agent: ${AGENT}   rival: ${RIVAL}${C.reset}`);

  // ── Act 1: edge state ──────────────────────────────────────────────
  h('ACT 1 · Reading edge mainline state');
  let state: any;
  try {
    const r = await api(`/api/state?repo=${encodeURIComponent(REPO)}`);
    if (!r.ok || !r.json) throw new Error(`HTTP ${r.status}`);
    state = r.json;
  } catch (e: any) {
    console.log(`${C.red}✕ Cannot reach Convergence at ${BASE}: ${e.message}${C.reset}`);
    console.log(`${C.dim}  Start it first: npm run demo   (or set CONVERGENCE_URL to your workers.dev URL)${C.reset}`);
    process.exit(1);
  }
  console.log(`  ${C.green}✓${C.reset} Lamport clock L=${state.lamportClock} · ${Object.keys(state.files || {}).length} files`);
  console.log(`  ${C.green}✓${C.reset} Artifacts mode: ${(state.artifacts?.mode || 'memory').toUpperCase()}${state.artifacts?.remotes?.[REPO]?.remote ? ` (${state.artifacts.remotes[REPO].remote})` : ''}`);
  await sleep(900);

  // ── Act 2: MCP handshake ───────────────────────────────────────────
  h('ACT 2 · MCP handshake (initialize → tools/list)');
  const init = await mcp('initialize', {});
  console.log(`  ${C.green}✓${C.reset} server: ${init.serverInfo?.name} v${init.serverInfo?.version}`);
  const tools = await mcp('tools/list', {});
  console.log(`  ${C.green}✓${C.reset} ${tools.tools?.length} tools exposed (lease → push → provenance)`);
  await sleep(900);

  // ── Act 3: lease before tokens ─────────────────────────────────────
  h(`ACT 3 · ${AGENT} acquires lease on ${SYMBOL}`);
  const leaseOut = mcpText(
    await mcp('tools/call', {
      name: 'convergence_acquire_lease',
      arguments: { symbolId: SYMBOL, agentId: AGENT, ttlSeconds: 60, intent: 'Autonomous fraud-scorer synthesis' },
    })
  );
  console.log(`  ${leaseOut.split('\n').join('\n  ')}`);
  if (!leaseOut.includes('LEASE ACQUIRED')) throw new Error('Lease was not granted — aborting (a peer may hold it).');
  await sleep(900);

  // ── Act 4: rival collides, gets 423 ────────────────────────────────
  h(`ACT 4 · ${RIVAL} collides → HTTP 423 backpressure (0 tokens wasted)`);
  const rivalOut = mcpText(
    await mcp('tools/call', {
      name: 'convergence_acquire_lease',
      arguments: { symbolId: SYMBOL, agentId: RIVAL, ttlSeconds: 60, intent: 'Competing refactor attempt' },
    })
  );
  console.log(`  ${rivalOut.split('\n').join('\n  ')}`);
  if (!rivalOut.includes('423')) throw new Error('Expected HTTP 423 backpressure for the rival agent.');
  console.log(`  ${C.green}✓${C.reset} rival blocked BEFORE generating code — no LLM tokens burned`);
  await sleep(900);

  // ── Act 5: push symbol via MCP ─────────────────────────────────────
  h(`ACT 5 · ${AGENT} pushes TypeScript symbol via MCP (0 conflicts)`);
  const t0 = Date.now();
  const pushOut = mcpText(
    await mcp('tools/call', {
      name: 'convergence_push_symbol',
      arguments: {
        repo: REPO,
        filename: FILE,
        symbolId: SYMBOL,
        code: FRAUD_SNIPPET,
        message: 'feat: autonomous fraud-signal scorer via live MCP agent',
        reasoning: 'Velocity + amount + geo-mismatch weighted score; boundary guard synthesized pre-push',
        agentId: AGENT,
      },
    })
  );
  console.log(`  ${pushOut.split('\n').join('\n  ')}`);
  console.log(`  ${C.green}✓${C.reset} edge graft latency: ${Date.now() - t0}ms`);
  await sleep(900);

  // ── Act 6: verify ──────────────────────────────────────────────────
  h('ACT 6 · Verify: AST index + Git Notes Chain-of-Thought');
  const syms = await api(`/api/symbols?file=${encodeURIComponent(FILE)}&repo=${encodeURIComponent(REPO)}`);
  const found = (syms.json?.symbols || []).some((s: any) => s.id === SYMBOL || s.name === 'verifyFraudScore');
  console.log(`  ${found ? C.green + '✓' : C.red + '✕'}${C.reset} ${SYMBOL} indexed in ${FILE} (${syms.json?.count ?? 0} symbols)`);
  const prov = await api(`/api/provenance?repo=${encodeURIComponent(REPO)}`);
  const mine = (Array.isArray(prov.json) ? prov.json : []).filter((p: any) => p.agentId === AGENT).pop();
  if (mine) {
    console.log(`  ${C.green}✓${C.reset} refs/notes/agent-provenance → ${mine.symbolId} by ${mine.agentId}`);
    console.log(`  ${C.dim}"${mine.promptIntent}"${C.reset}`);
  }
  if (!found || !mine) throw new Error('Verification failed: symbol or provenance record missing.');

  // ── Finale ─────────────────────────────────────────────────────────
  h('FINALE · Autonomous loop complete');
  console.log(`  ${C.green}✓${C.reset} lease → 423 backpressure → AST-CRDT graft → CoT provenance`);
  console.log(`  ${C.bold}Convergence: 0 merge conflicts, 0 wasted tokens.${C.reset}\n`);
}

main().catch((e) => {
  console.error(`\n${C.red}✕ LIVE AGENT FAILED: ${e.message}${C.reset}`);
  process.exit(1);
});
