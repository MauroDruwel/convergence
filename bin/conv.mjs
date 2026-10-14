#!/usr/bin/env -S node --import=tsx

/**
 * ⚡ CONVERGENCE CLI (`conv`)
 * Next-Gen Autonomous Edge Git Platform CLI & MCP Server.
 * Connects developers, agents (Claude Code, Cursor, Copilot), and edge workers.
 */

import http from 'node:http';
import readline from 'node:readline';

const CONVERGENCE_URL = process.env.CONVERGENCE_URL || 'http://localhost:3000';
const args = process.argv.slice(2);

// Check if running in MCP (Model Context Protocol) mode
if (args[0] === 'mcp') {
  runMcpServer();
} else {
  runCliCommand(args);
}

/**
 * Executes a CLI command against the Convergence backend
 */
async function runCliCommand(commandArgs) {
  const fullCommand = commandArgs.length > 0 ? `conv ${commandArgs.join(' ')}` : 'conv help';

  try {
    const res = await fetch(`${CONVERGENCE_URL}/api/cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: fullCommand, agentId: process.env.CONV_AGENT || 'claude_local' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.stdout) console.log(data.stdout);
      if (data.stderr) console.error(data.stderr);
      process.exit(data.success ? 0 : 1);
    } else {
      console.error(`Convergence Server HTTP ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
  } catch (err) {
    try {
      if (!process.env._CONV_TSX_ATTEMPTED) {
        const { spawnSync } = await import('node:child_process');
        const { fileURLToPath } = await import('node:url');
        const scriptPath = fileURLToPath(import.meta.url);
        const result = spawnSync('node', ['--import', 'tsx', scriptPath, ...process.argv.slice(2)], {
          stdio: 'inherit',
          env: { ...process.env, _CONV_TSX_ATTEMPTED: '1' }
        });
        process.exit(result.status ?? 0);
      }
      const { getLocalBrain } = await import('../src/index.ts');
      const { ConvEngine } = await import('../src/cli/conv-engine.ts');
      const engine = new ConvEngine(getLocalBrain());
      const res = await engine.execute(fullCommand, process.env.CONV_AGENT || 'claude_local');
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      process.exit(res.success ? 0 : 1);
    } catch (fallbackErr) {
      console.error(`⚡ Convergence CLI: Could not connect to edge server at ${CONVERGENCE_URL}.`);
      console.error(`   Make sure the Convergence server is running via 'npm run start' or 'npm run demo'.`);
      console.error(`   Error details: ${err.message} (${fallbackErr.message})`);
      process.exit(1);
    }
  }
}

/**
 * Starts a native Model Context Protocol (MCP) server over stdio for Claude Code.
 */
function runMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const TOOLS = [
    {
      name: 'convergence_status',
      description: 'Get current status of the Convergence edge Git repository, active symbol leases, and Lamport logical clock.',
      inputSchema: {
        type: 'object',
        properties: {
          json: { type: 'boolean', description: 'Return machine-readable JSON' },
        },
      },
    },
    {
      name: 'convergence_read_file',
      description: 'Read a file from the Convergence mainline repository without cloning.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Path to file (e.g. index.ts)' },
        },
        required: ['filename'],
      },
    },
    {
      name: 'convergence_list_symbols',
      description: 'Inspect and parse all AST symbol nodes in a file, including functions, interfaces, and hashes.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Path to file (e.g. index.ts)' },
        },
        required: ['filename'],
      },
    },
    {
      name: 'convergence_acquire_lease',
      description: 'Acquire an edit-time symbol lease before modifying code. Prevents LLM token waste from race conditions.',
      inputSchema: {
        type: 'object',
        properties: {
          symbolId: { type: 'string', description: 'Target symbol (e.g. func:processOrder)' },
          agentId: { type: 'string', description: 'Agent identifier (e.g. claude_architect)' },
          ttlSeconds: { type: 'number', description: 'Lease TTL in seconds (default 15)' },
        },
        required: ['symbolId'],
      },
    },
    {
      name: 'convergence_release_lease',
      description: 'Release a previously held symbol lease.',
      inputSchema: {
        type: 'object',
        properties: {
          symbolId: { type: 'string', description: 'Target symbol (e.g. func:processOrder)' },
          agentId: { type: 'string', description: 'Agent identifier' },
        },
        required: ['symbolId'],
      },
    },
    {
      name: 'convergence_push_symbol',
      description: 'Push a code snippet or AST symbol function directly into the repository with commutative CRDT merge and Git Notes Chain-of-Thought.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Target file (default index.ts)' },
          symbolId: { type: 'string', description: 'Symbol identifier (e.g. func:fastSettle)' },
          code: { type: 'string', description: 'TypeScript code snippet to graft' },
          message: { type: 'string', description: 'Commit message' },
          reasoning: { type: 'string', description: 'Chain-of-Thought rationale for refs/notes/agent-provenance' },
          agentId: { type: 'string', description: 'Author agent ID' },
        },
        required: ['code', 'message'],
      },
    },
    {
      name: 'convergence_open_reverse_pr',
      description: 'Open a Reverse Pull Request when encountering an architectural dilemma, asking the human architect for 1-click direction.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Architectural dilemma or trade-off' },
          options: { type: 'array', items: { type: 'string' }, description: 'List of actionable options for human to choose' },
          agentId: { type: 'string', description: 'Agent identifier' },
        },
        required: ['question', 'options'],
      },
    },
    {
      name: 'convergence_run_cli',
      description: 'Execute any arbitrary Convergence CLI command (e.g. conv status, conv tree, conv notes).',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The exact CLI command string (e.g. "conv status --json")' },
        },
        required: ['command'],
      },
    },
  ];

  async function executeCliRemote(cmd) {
    try {
      const res = await fetch(`${CONVERGENCE_URL}/api/cli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, agentId: 'claude_mcp' }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.stdout || data.stderr || 'Command executed.';
      }
      return `Server returned HTTP ${res.status}: ${await res.text()}`;
    } catch (e) {
      return `Error connecting to ${CONVERGENCE_URL}: ${e.message}`;
    }
  }

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    try {
      const req = JSON.parse(line);
      const { id, method, params } = req;

      if (method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'convergence-mcp-server',
              version: '2.4.0',
            },
          },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } else if (method === 'notifications/initialized') {
        // Client ack
      } else if (method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } else if (method === 'tools/call') {
        const name = params?.name;
        const toolArgs = params?.arguments || {};
        let textResult = '';

        if (name === 'convergence_status') {
          textResult = await executeCliRemote(toolArgs.json ? 'conv status --json' : 'conv status');
        } else if (name === 'convergence_read_file') {
          textResult = await executeCliRemote(`conv pull ${toolArgs.filename || 'index.ts'}`);
        } else if (name === 'convergence_list_symbols') {
          textResult = await executeCliRemote(`conv symbols ${toolArgs.filename || 'index.ts'}`);
        } else if (name === 'convergence_acquire_lease') {
          const opt = [
            `conv lease acquire ${toolArgs.symbolId}`,
            toolArgs.agentId ? `--agent ${toolArgs.agentId}` : '',
            toolArgs.ttlSeconds ? `--ttl ${toolArgs.ttlSeconds}` : '',
          ].filter(Boolean).join(' ');
          textResult = await executeCliRemote(opt);
        } else if (name === 'convergence_release_lease') {
          const opt = [
            `conv lease release ${toolArgs.symbolId}`,
            toolArgs.agentId ? `--agent ${toolArgs.agentId}` : '',
          ].filter(Boolean).join(' ');
          textResult = await executeCliRemote(opt);
        } else if (name === 'convergence_push_symbol') {
          const res = await fetch(`${CONVERGENCE_URL}/api/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: toolArgs.agentId || 'claude_code',
              filename: toolArgs.filename || 'index.ts',
              sourceCode: toolArgs.code,
              message: toolArgs.message,
              promptIntent: toolArgs.reasoning || toolArgs.message,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            textResult = `✓ Committed symbol to main! Commit ID: ${data.commitId}, Clean Merge: ${data.cleanMerge}`;
          } else {
            textResult = `Failed to commit: ${await res.text()}`;
          }
        } else if (name === 'convergence_open_reverse_pr') {
          const opt = [
            `conv rpr open`,
            `--question "${(toolArgs.question || '').replace(/"/g, '\\"')}"`,
            `--options "${(toolArgs.options || []).join(',')}"`,
            toolArgs.agentId ? `--agent ${toolArgs.agentId}` : '',
          ].filter(Boolean).join(' ');
          textResult = await executeCliRemote(opt);
        } else if (name === 'convergence_run_cli') {
          textResult = await executeCliRemote(toolArgs.command);
        } else {
          textResult = `Unknown tool: ${name}`;
        }

        const response = {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: textResult }],
          },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } else {
        const response = {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      // JSON parse error
    }
  });
}
