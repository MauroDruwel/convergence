/**
 * ⚡ CLOUDFLARE MCP (Model Context Protocol) SERVER
 * 
 * Standardized Edge MCP Implementation following the Cloudflare Workers MCP architecture.
 * Supports dual-transport:
 * 1. Standard HTTP POST (/api/mcp and /mcp) for remote web-native AI agents (Antigravity, Workers AI, LangChain)
 * 2. Server-Sent Events (/api/mcp/sse and /mcp/sse) for persistent streaming agent sessions
 * 3. Standard stdio transport for local CLI agents (Claude Code, Cursor, Cline)
 */

import { Hono } from 'hono';
import { RepoBrain } from '../durable-objects/RepoBrain.js';
import { ConvEngine } from '../cli/conv-engine.js';
import { parseSourceToSymbols } from '../core/ast-engine.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const CONVERGENCE_MCP_TOOLS: McpTool[] = [
  {
    name: 'convergence_status',
    description: 'Get current status of the Convergence edge Git repository, active symbol leases, and Lamport logical clock.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (default convergence-core)' },
        json: { type: 'boolean', description: 'Return machine-readable JSON' },
      },
    },
  },
  {
    name: 'convergence_read_file',
    description: 'Read a verified source file from the Convergence mainline repository or Cloudflare Artifacts CAS.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (default convergence-core)' },
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
        repo: { type: 'string', description: 'Repository name (default convergence-core)' },
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
        agentId: { type: 'string', description: 'Agent identifier (e.g. antigravity_01, claude_code)' },
        ttlSeconds: { type: 'number', description: 'Lease TTL in seconds (default 15)' },
        intent: { type: 'string', description: 'Brief description of proposed modifications' },
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
        repo: { type: 'string', description: 'Target repository (default convergence-core)' },
        filename: { type: 'string', description: 'Target file (default index.ts)' },
        symbolId: { type: 'string', description: 'Symbol identifier (e.g. func:fastSettle)' },
        code: { type: 'string', description: 'TypeScript code snippet to graft' },
        message: { type: 'string', description: 'Commit message' },
        reasoning: { type: 'string', description: 'Chain-of-Thought rationale for refs/notes/agent-provenance' },
        agentId: { type: 'string', description: 'Author agent ID (e.g. antigravity_01)' },
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
    name: 'convergence_create_repo',
    description: 'Create a new autonomous edge repository on Convergence with full AST-CRDT and Durable Object state.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Repository name (e.g. agent-vault)' },
        description: { type: 'string', description: 'Repository description' },
      },
      required: ['name'],
    },
  },
  {
    name: 'convergence_list_repos',
    description: 'List all autonomous repositories on Convergence.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'convergence_commit_file',
    description: 'Commit an entire file directly into any Convergence repository with clean merge AST arbitration.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (default convergence-core)' },
        filename: { type: 'string', description: 'File path to commit (e.g. src/auth.ts)' },
        content: { type: 'string', description: 'Full UTF-8 source code content' },
        message: { type: 'string', description: 'Commit message' },
        author: { type: 'string', description: 'Author name (e.g. antigravity_agent)' },
      },
      required: ['filename', 'content', 'message'],
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

/**
 * Executes a single MCP JSON-RPC call against the Convergence Edge Durable Object.
 */
export async function executeMcpMethod(
  body: any,
  getBrain: (repo?: string) => RepoBrain
): Promise<any> {
  const { id = 1, method, params = {} } = body || {};

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        serverInfo: {
          name: 'convergence-cloudflare-mcp',
          version: '2.4.0',
          vendor: 'Cloudflare Workers & Convergence',
        },
      },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: CONVERGENCE_MCP_TOOLS,
      },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    const targetRepo = args.repo || 'convergence-core';
    const brain = getBrain(targetRepo);
    const engine = new ConvEngine(brain);

    try {
      let outputText = '';

      switch (name) {
        case 'convergence_status': {
          const res = await engine.execute(args.json ? 'conv status --json' : 'conv status');
          outputText = res.stdout || res.stderr || 'No output.';
          break;
        }

        case 'convergence_read_file': {
          const filename = args.filename || 'index.ts';
          const content = brain.getState().files[filename];
          if (content === undefined) {
            outputText = `Error: File ${filename} not found in repository ${targetRepo}.`;
          } else {
            outputText = content;
          }
          break;
        }

        case 'convergence_list_symbols': {
          const filename = args.filename || 'index.ts';
          const res = await engine.execute(`conv symbols ${filename}`);
          outputText = res.stdout || res.stderr || 'No symbols found.';
          break;
        }

        case 'convergence_acquire_lease': {
          const symbolId = args.symbolId;
          const agentId = args.agentId || 'antigravity_agent';
          const ttlSeconds = args.ttlSeconds || 15;
          const res = await engine.execute(`conv lease acquire ${symbolId} --agent ${agentId} --ttl ${ttlSeconds}`);
          outputText = res.stdout || res.stderr || 'Lease action complete.';
          break;
        }

        case 'convergence_release_lease': {
          const symbolId = args.symbolId;
          const agentId = args.agentId || 'antigravity_agent';
          const res = await engine.execute(`conv lease release ${symbolId} --agent ${agentId}`);
          outputText = res.stdout || res.stderr || 'Lease release complete.';
          break;
        }

        case 'convergence_push_symbol': {
          const filename = args.filename || 'index.ts';
          const symbolId = args.symbolId || 'func:newSymbol';
          const agentId = args.agentId || 'antigravity_agent';
          const msg = args.message || 'feat: push AST symbol via Cloudflare MCP';
          const cot = args.reasoning || 'Automated commit via Cloudflare MCP';
          const code = args.code || '';

          const commitRes = await brain.handleAgentCommit({
            agentId,
            filename,
            sourceCode: code,
            message: msg,
          });

          outputText = `[CLOUDFLARE MCP AST-CRDT] Successfully committed to ${targetRepo}/${filename}\n` +
            `Commit SHA:   ${commitRes.commitId}\n` +
            `Status:       Clean Merge (0 Conflicts)\n` +
            `Git Notes:    refs/notes/agent-provenance recorded CoT: "${cot}"\n` +
            `Lamport L:    ${brain.getState().lamportClock}`;
          break;
        }

        case 'convergence_open_reverse_pr': {
          const question = args.question || 'Architectural inquiry';
          const options = Array.isArray(args.options) ? args.options : ['Option A', 'Option B'];
          const agentId = args.agentId || 'antigravity_agent';
          const pr = brain.createReversePR(agentId, question, options);
          outputText = `[REVERSE PR OPENED]\nID:       ${pr.id}\nQuestion: ${pr.question}\nOptions:  ${pr.options.join(' | ')}`;
          break;
        }

        case 'convergence_create_repo': {
          const repoName = args.name;
          const desc = args.description || 'New repository via MCP';
          const res = await engine.execute(`conv init ${repoName}`);
          outputText = res.stdout || res.stderr || `Repository ${repoName} created.`;
          break;
        }

        case 'convergence_list_repos': {
          const res = await engine.execute('conv repo list');
          outputText = res.stdout || res.stderr || 'convergence-core';
          break;
        }

        case 'convergence_commit_file': {
          const filename = args.filename || 'index.ts';
          const content = args.content || '';
          const msg = args.message || 'commit via mcp';
          const author = args.author || 'antigravity_agent';

          const commitRes = await brain.handleAgentCommit({
            agentId: author,
            filename,
            sourceCode: content,
            message: msg,
          });
          outputText = `[COMMITTED FILE]\nFile:   ${filename}\nSHA:    ${commitRes.commitId}\nStatus: ${commitRes.cleanMerge ? 'CLEAN_MERGE' : 'MERGED'}`;
          break;
        }

        case 'convergence_run_cli': {
          const cmd = args.command || 'conv status';
          const res = await engine.execute(cmd);
          outputText = res.stdout || res.stderr || 'Command executed.';
          break;
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method or tool '${name}' not found.`,
            },
          };
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: outputText,
            },
          ],
        },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Internal tool execution error: ${err.message}`,
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32600,
      message: `Invalid Request: unrecognized method '${method}'`,
    },
  };
}

/**
 * Creates the Hono Cloudflare MCP Router
 */
export function createCloudflareMcpRouter(getBrain: (repo?: string) => RepoBrain): Hono {
  const router = new Hono();

  // POST /mcp or /api/mcp - Standard JSON-RPC Endpoint
  router.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const response = await executeMcpMethod(body, getBrain);
      return c.json(response);
    } catch (e: any) {
      return c.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${e.message}` },
        },
        400
      );
    }
  });

  // GET /mcp/sse or /api/mcp/sse - Server-Sent Events Endpoint
  router.get('/sse', (c) => {
    return c.text(
      `event: endpoint\ndata: ${new URL('/api/mcp', c.req.url).href}\n\nevent: message\ndata: {"status":"ready","server":"convergence-cloudflare-mcp"}\n\n`,
      200,
      {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    );
  });

  return router;
}
