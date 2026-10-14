import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';

const TEST_PORT = 3997;
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

describe('⚡ Antigravity & Cloudflare MCP Agent Integration Test Suite', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: 'pipe',
    });

    const isUp = await waitForServer(TEST_PORT);
    if (!isUp) throw new Error(`Convergence server failed to start on port ${TEST_PORT}`);
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('1. should connect to Cloudflare MCP SSE endpoint (/api/mcp/sse)', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp/sse`);
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('event: endpoint');
    expect(body).toContain('/api/mcp');
  });

  it('2. should handle MCP "initialize" handshake from an AI agent', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: { name: 'antigravity-agent', version: '2.0.0' },
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.result.serverInfo.name).toBe('convergence-cloudflare-mcp');
    expect(data.result.protocolVersion).toBe('2024-11-05');
  });

  it('3. should list all 11 MCP tools available for autonomous agents via "tools/list"', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.result.tools)).toBe(true);
    const toolNames = data.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('convergence_status');
    expect(toolNames).toContain('convergence_acquire_lease');
    expect(toolNames).toContain('convergence_push_symbol');
    expect(toolNames).toContain('convergence_open_reverse_pr');
    expect(toolNames).toContain('convergence_create_repo');
  });

  it('4. should call "convergence_status" tool and return edge repository telemetry', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'convergence_status',
          arguments: { json: true },
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.result.content[0].type).toBe('text');
    expect(data.result.content[0].text).toContain('convergence-core');
  });

  it('5. should allow an AI agent to acquire a symbol lease with semantic backpressure', async () => {
    // Agent 1 acquires lease
    const res1 = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'convergence_acquire_lease',
          arguments: {
            symbolId: 'func:processPayment',
            agentId: 'antigravity_agent_alpha',
            ttlSeconds: 15,
          },
        },
      }),
    });
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as any;
    expect(data1.result.content[0].text).toContain('[LEASE ACQUIRED]');

    // Agent 2 attempts to acquire same symbol -> receives backpressure
    const res2 = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'convergence_acquire_lease',
          arguments: {
            symbolId: 'func:processPayment',
            agentId: 'antigravity_agent_beta',
            ttlSeconds: 15,
          },
        },
      }),
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as any;
    expect(data2.result.content[0].text).toContain('Backpressure advisory');
    expect(data2.result.content[0].text).toContain('HTTP 423 LOCKED');
  });

  it('6. should allow an AI agent to commit code with Git Notes Chain-of-Thought', async () => {
    const code = `
export function antigravityOptimizer(tasks: string[]): number {
  return tasks.length * 42;
}
`;
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'convergence_push_symbol',
          arguments: {
            filename: 'index.ts',
            symbolId: 'func:antigravityOptimizer',
            code,
            message: 'feat: add antigravity multi-task batch optimizer',
            reasoning: 'Synthesized parallel work scheduler to eliminate execution stalls',
            agentId: 'antigravity_agent_alpha',
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.result.content[0].text).toContain('[CLOUDFLARE MCP AST-CRDT] Successfully committed');
    expect(data.result.content[0].text).toContain('Clean Merge (0 Conflicts)');
    expect(data.result.content[0].text).toContain('refs/notes/agent-provenance');
  });

  it('7. should allow an AI agent to open a Reverse Pull Request via MCP', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'convergence_open_reverse_pr',
          arguments: {
            question: 'Should we store embeddings in Cloudflare Vectorize or DO SQLite?',
            options: ['Vectorize (Edge Index)', 'DO SQLite (Local Strict ACID)'],
            agentId: 'antigravity_architect',
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.result.content[0].text).toContain('[REVERSE PR OPENED]');
    expect(data.result.content[0].text).toContain('Vectorize');
  });

  it('8. should allow an AI agent to create a brand-new repository over Cloudflare MCP', async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'convergence_create_repo',
          arguments: {
            name: 'agent-sandbox-repo',
            description: 'Autonomous micro-repo provisioned by Antigravity Agent',
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.result.content[0].text).toContain('Repository initialized: agent-sandbox-repo');
  });
});
