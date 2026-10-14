import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { spawn, ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import app from '../src/index.js';

const PORT = 3012;
const BASE_URL = `http://localhost:${PORT}`;

describe('Multi-Repository & Full Edge Push Workflow Test Suite', () => {
  let serverInstance: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      serverInstance = serve({ fetch: app.fetch, port: PORT }, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => serverInstance.close(resolve));
    }
  });

  it('1. should list initial repositories via GET /api/repos and GET /api/v1/user/repos', async () => {
    const res = await fetch(`${BASE_URL}/api/repos`);
    expect(res.status).toBe(200);
    const repos = (await res.json()) as any[];
    expect(Array.isArray(repos)).toBe(true);
    expect(repos.some((r) => r.name === 'convergence-core')).toBe(true);

    const ghRes = await fetch(`${BASE_URL}/api/v1/user/repos`);
    expect(ghRes.status).toBe(200);
    const ghRepos = (await ghRes.json()) as any[];
    expect(ghRepos.some((r) => r.name === 'convergence-core')).toBe(true);
  });

  it('2. should create a new repository via POST /api/repos', async () => {
    const res = await fetch(`${BASE_URL}/api/repos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'edge-fintech-hub',
        description: 'Autonomous payment clearing on Cloudflare Workers',
        auto_init: true,
      }),
    });
    expect(res.status).toBe(201);
    const repo = (await res.json()) as any;
    expect(repo.name).toBe('edge-fintech-hub');
    expect(repo.html_url).toContain('edge-fintech-hub');
    expect(repo.default_branch).toBe('main');

    // Verify it is in list
    const listRes = await fetch(`${BASE_URL}/api/repos`);
    const list = (await listRes.json()) as any[];
    expect(list.some((r) => r.name === 'edge-fintech-hub')).toBe(true);
  });

  it('3. should create a new repository via GitHub-compatible POST /api/v1/user/repos', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/user/repos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'claude-agent-sandbox',
        description: 'Hermetic AI agent testing sandbox',
      }),
    });
    expect(res.status).toBe(201);
    const repo = (await res.json()) as any;
    expect(repo.name).toBe('claude-agent-sandbox');
    expect(repo.clone_url).toContain('conv clone claude-agent-sandbox');
  });

  it('4. should retrieve metadata and contents for the new repository', async () => {
    const metaRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/edge-fintech-hub`);
    expect(metaRes.status).toBe(200);
    const meta = (await metaRes.json()) as any;
    expect(meta.name).toBe('edge-fintech-hub');

    const contentsRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/edge-fintech-hub/contents`);
    expect(contentsRes.status).toBe(200);
    const files = (await contentsRes.json()) as any[];
    expect(Array.isArray(files)).toBe(true);
    expect(files.some((f) => f.name === 'README.md')).toBe(true);
    expect(files.some((f) => f.name === 'index.ts')).toBe(true);

    const indexRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/edge-fintech-hub/contents/index.ts`);
    expect(indexRes.status).toBe(200);
    const indexFile = (await indexRes.json()) as any;
    const decoded = Buffer.from(indexFile.content, 'base64').toString('utf8');
    expect(decoded).toContain('edge-fintech-hub');
  });

  it('5. should commit a new file into the new repository via GitHub PUT API', async () => {
    const code = `export interface Settlement { id: string; amount: number; settled: boolean; }\nexport function settle(tx: Settlement): boolean { return tx.settled; }\n`;
    const res = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/edge-fintech-hub/contents/src/settle.ts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'feat: add settlement engine interface',
        content: Buffer.from(code).toString('base64'),
        encoding: 'base64',
        author: { name: 'claude_fintech_specialist' },
      }),
    });
    expect(res.status).toBe(200);
    const commitData = (await res.json()) as any;
    expect(commitData.commit.cleanMerge).toBe(true);

    // Verify commit shows in commits list
    const commitsRes = await fetch(`${BASE_URL}/api/v1/repos/mauro-druwel/edge-fintech-hub/commits`);
    expect(commitsRes.status).toBe(200);
    const commits = (await commitsRes.json()) as any[];
    expect(commits.length).toBeGreaterThan(0);
    expect(commits.some((c) => c.commit.message.includes('settlement engine'))).toBe(true);
  });

  it('6. should initialize a repository using "conv init" via CLI endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'conv init agent-router "Autonomous traffic router"', agentId: 'claude_dev' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.stdout).toContain('[CONVERGENCE INIT]');
    expect(json.stdout).toContain('agent-router');
  });

  it('7. should clone repository files to disk using "conv clone"', async () => {
    const cloneDir = join('/tmp', `conv_test_clone_${Date.now()}`);
    const res = await fetch(`${BASE_URL}/api/cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: `conv clone convergence-core ${cloneDir}`, agentId: 'claude_dev' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(existsSync(join(cloneDir, 'index.ts'))).toBe(true);
    expect(existsSync(join(cloneDir, 'README.md'))).toBe(true);

    const readme = readFileSync(join(cloneDir, 'README.md'), 'utf8');
    expect(readme).toContain('convergence-core');

    // Clean up
    rmSync(cloneDir, { recursive: true, force: true });
  });

  it('8. should push an existing local file from disk using "conv push <file>"', async () => {
    const tempFile = join('/tmp', `temp_test_module_${Date.now()}.ts`);
    const code = `// Local file written to disk\nexport function localDiskVerification(): string { return "verified-from-disk"; }\n`;
    writeFileSync(tempFile, code, 'utf8');

    const res = await fetch(`${BASE_URL}/api/cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: `conv push ${tempFile} --message "Push local disk file"`,
        agentId: 'claude_dev',
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.stdout).toContain('[AST-CRDT] Successfully committed to main');

    // Clean up
    rmSync(tempFile, { force: true });
  });

  it('9. should handle MCP convergence_create_repo and convergence_commit_file over stdio', async () => {
    const mcpProc = spawn('./bin/conv.mjs', ['mcp'], {
      env: { ...process.env, CONVERGENCE_URL: BASE_URL },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const sendRpc = (method: string, params: any, id: number) => {
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      mcpProc.stdin?.write(payload);
    };

    let receivedResolve: (val: any) => void;
    const rpcPromise = new Promise((resolve) => {
      receivedResolve = resolve;
    });

    const lines: string[] = [];
    mcpProc.stdout?.on('data', (chunk) => {
      const str = chunk.toString();
      lines.push(str);
      if (lines.join('').includes('"id":3')) {
        receivedResolve(lines.join(''));
      }
    });

    // 1. Initialize
    sendRpc('initialize', {}, 1);
    await new Promise((r) => setTimeout(r, 60));

    // 2. Create repo via MCP
    sendRpc(
      'tools/call',
      {
        name: 'convergence_create_repo',
        arguments: { name: 'mcp-spawned-repo', description: 'Created via Claude Code MCP' },
      },
      2
    );
    await new Promise((r) => setTimeout(r, 80));

    // 3. Commit file via MCP
    sendRpc(
      'tools/call',
      {
        name: 'convergence_commit_file',
        arguments: {
          repo: 'mcp-spawned-repo',
          filename: 'mcp.ts',
          content: 'export const MCP_ACTIVE = true;',
          message: 'feat: add mcp declaration',
          author: 'claude_mcp_client',
        },
      },
      3
    );

    const allOutput = (await Promise.race([
      rpcPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('MCP timeout')), 6000)),
    ])) as string;

    mcpProc.kill();

    expect(allOutput).toContain('mcp-spawned-repo');
    expect(allOutput).toContain('CleanMerge');
  });
});
