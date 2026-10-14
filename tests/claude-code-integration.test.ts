import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';
import { ConvEngine } from '../src/cli/conv-engine.js';
import { getLocalBrain } from '../src/index.js';

const TEST_PORT = 3998;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(port: number, timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://localhost:${port}/api/state`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
      });
      if (ok) return true;
    } catch (e) {}
    await wait(250);
  }
  return false;
}

describe('Claude Code & Convergence CLI Integration Test Suite', () => {
  let serverProcess: ChildProcess;
  const brain = getLocalBrain();
  const engine = new ConvEngine(brain);

  beforeAll(async () => {
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: 'pipe',
    });

    const isUp = await waitForServer(TEST_PORT);
    if (!isUp) throw new Error(`Server failed to start on port ${TEST_PORT}`);
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  // 1. Direct ConvEngine Unit Tests
  it('1. should execute "conv status" and output formatted repository status', async () => {
    const res = await engine.execute('conv status');
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('CONVERGENCE EDGE REPOSITORY STATUS');
    expect(res.stdout).toContain('mauro-druwel/convergence-core');
    expect(res.stdout).toContain('Lamport Logical L:');
  });

  it('2. should execute "conv status --json" and return valid JSON state', async () => {
    const res = await engine.execute('conv status --json');
    expect(res.success).toBe(true);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.repository).toBe('convergence-core');
    expect(parsed.branch).toBe('main');
    expect(parsed.protocol).toContain('AST-CRDT');
  });

  it('3. should execute "conv symbols index.ts" and extract all AST nodes', async () => {
    const res = await engine.execute('conv symbols index.ts');
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('AST SYMBOLS IN index.ts');
    expect(res.stdout).toContain('func:authorizePayment');
    expect(res.stdout).toContain('func:processOrder');
  });

  it('4. should acquire and release symbol leases via CLI', async () => {
    const acq = await engine.execute('conv lease acquire func:authorizePayment --agent claude_code --ttl 10');
    expect(acq.success).toBe(true);
    expect(acq.stdout).toContain('[LEASE ACQUIRED]');

    const list = await engine.execute('conv lease list');
    expect(list.stdout).toContain('func:authorizePayment');

    const rel = await engine.execute('conv lease release func:authorizePayment --agent claude_code');
    expect(rel.success).toBe(true);
    expect(rel.stdout).toContain('[LEASE RELEASED]');
  });

  it('5. should push a new AST function via "conv push" with Chain-of-Thought', async () => {
    const res = await engine.execute(
      'conv push index.ts --symbol func:fastSettleBatch --cot "Zero-copy settlement aggregator" --agent claude_optimizer'
    );
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('[AST-CRDT] Successfully committed to main');
    expect(res.stdout).toContain('Git Notes:    refs/notes/agent-provenance updated');
  });

  it('6. should open, list, and resolve Reverse Pull Requests via CLI', async () => {
    const openRes = await engine.execute(
      'conv rpr open --question "Use D1 SQLite or DO memory?" --options "D1 SQLite,DO Memory" --agent claude_architect'
    );
    expect(openRes.success).toBe(true);
    expect(openRes.stdout).toContain('[REVERSE PR OPENED]');
    const prId = openRes.data.id;

    const listRes = await engine.execute('conv rpr list');
    expect(listRes.stdout).toContain(prId);

    const resolveRes = await engine.execute(`conv rpr resolve ${prId} --choice "D1 SQLite"`);
    expect(resolveRes.success).toBe(true);
    expect(resolveRes.stdout).toContain('Locked choice "D1 SQLite"');
  });

  it('7. should trigger and survive adversarial immune probe via CLI', async () => {
    const res = await engine.execute('conv immune probe');
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('[IMMUNE SENTINEL] ADVERSARIAL PROBE INTERCEPTED');
    expect(res.stdout).toContain('Mainline Invariant:   Protected');
  });

  // 2. HTTP API & GitHub-Compatible REST Endpoints
  it('8. should execute CLI commands over HTTP POST /api/cli', async () => {
    const res = await fetch(`${BASE_URL}/api/cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'conv tree', agentId: 'claude_test' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.stdout).toContain('CONVERGENCE MAINLINE MERKLE TREE:');
    expect(json.stdout).toContain('index.ts');
  });

  it('9. should return GitHub-compatible repository metadata via /api/v1/repos/:owner/:repo', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/convergence-core`);
    expect(res.status).toBe(200);
    const repo = (await res.json()) as any;
    expect(repo.name).toBe('convergence-core');
    expect(repo.default_branch).toBe('main');
    expect(repo.html_url).toContain('mauro-druwel/convergence-core');
  });

  it('10. should list repository files and retrieve file content via GitHub-compatible contents API', async () => {
    const listRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/convergence-core/contents`);
    expect(listRes.status).toBe(200);
    const files = (await listRes.json()) as any;
    expect(Array.isArray(files)).toBe(true);
    expect(files.some((f: any) => f.name === 'index.ts')).toBe(true);

    const fileRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/convergence-core/contents/index.ts`);
    expect(fileRes.status).toBe(200);
    const file = (await fileRes.json()) as any;
    expect(file.encoding).toBe('base64');
    const decoded = Buffer.from(file.content, 'base64').toString('utf8');
    expect(decoded).toContain('PaymentConfig');
  });

  it('11. should commit a new file via GitHub-compatible PUT /api/v1/repos/:owner/:repo/contents/:path', async () => {
    const newCode = `export const GITHUB_API_TEST = true;\nexport function testEndpoint(): string { return "ok"; }\n`;
    const res = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/convergence-core/contents/github-test.ts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'feat(api): commit via GitHub-compatible REST API',
        content: Buffer.from(newCode).toString('base64'),
        encoding: 'base64',
        author: { name: 'claude_code' },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.commit.cleanMerge).toBe(true);

    // Verify raw file serving
    const rawRes = await fetch(`${BASE_URL}/raw/github-test.ts`);
    expect(rawRes.status).toBe(200);
    const rawText = await rawRes.text();
    expect(rawText).toContain('GITHUB_API_TEST');
  });

  it('12. should list commits with clean merge telemetry via /api/v1/repos/:owner/:repo/commits', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/convergence-core/commits`);
    expect(res.status).toBe(200);
    const commits = (await res.json()) as any;
    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0].sha).toBeDefined();
  });

  it('13. should handle MCP (Model Context Protocol) JSON-RPC over stdio', async () => {
    const mcpProc = spawn('./bin/conv.mjs', ['mcp'], {
      env: { ...process.env, CONVERGENCE_URL: BASE_URL },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const sendRpc = (method: string, params: any, id: number) => {
      mcpProc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    };

    const readRpcResponse = (): Promise<any> => {
      return new Promise((resolve) => {
        mcpProc.stdout.once('data', (data) => {
          try {
            resolve(JSON.parse(data.toString()));
          } catch (e) {
            resolve(null);
          }
        });
      });
    };

    // 1. Initialize
    sendRpc('initialize', {}, 1);
    const initRes = await readRpcResponse();
    expect(initRes.result.serverInfo.name).toBe('convergence-mcp-server');

    // 2. Tools list
    sendRpc('tools/list', {}, 2);
    const toolsRes = await readRpcResponse();
    expect(Array.isArray(toolsRes.result.tools)).toBe(true);
    const toolNames = toolsRes.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('convergence_status');
    expect(toolNames).toContain('convergence_acquire_lease');
    expect(toolNames).toContain('convergence_push_symbol');

    // 3. Call tool: convergence_status
    sendRpc('tools/call', { name: 'convergence_status', arguments: { json: true } }, 3);
    const callRes = await readRpcResponse();
    expect(callRes.result.content[0].text).toContain('convergence-core');

    mcpProc.kill();
  });
});
