# 💻 Convergence CLI (`conv`) & Cloudflare MCP Server

Convergence provides a dual interface for both human developers and autonomous AI agents:
1. **The `conv` CLI Tool**: A Git-compatible CLI executable locally or via npx.
2. **Cloudflare Workers MCP Server**: A native Model Context Protocol server supporting triple-transport (HTTP JSON-RPC, Server-Sent Events, and local stdio).

---

## 1. The `conv` CLI Cheat Sheet

Convergence ships with `bin/conv.mjs`, accessible as `conv` or `npx conv`:

```bash
# Check repository state, active leases, and Lamport clock
npx conv status
npx conv status --json

# Initialize a new autonomous edge repository on Cloudflare
npx conv init my-agent-microservice

# Clone/hydrate a repository from Cloudflare Artifacts
npx conv clone my-agent-microservice

# Inspect parsed AST symbols in a file
npx conv symbols index.ts

# Acquire an edit-time symbol lease before coding (prevents token burn!)
npx conv lease acquire func:calculateTax --agent claude_01 --ttl 15

# Release a held lease
npx conv lease release func:calculateTax --agent claude_01

# Push code or an AST symbol directly to main (0 merge conflicts)
npx conv push index.ts --symbol func:calculateTax --cot "Optimized tax calc" --agent claude_01

# Inspect and resolve active Reverse Pull Requests
npx conv rpr list
npx conv rpr approve rpr-101 optionA

# Pull the latest verified snapshot from Cloudflare Artifacts
npx conv pull
```

---

## 2. 🤖 Cloudflare MCP Server Architecture

Convergence implements the official **Cloudflare Workers Model Context Protocol (MCP)** specification:

```
 [Google Antigravity Agents]   [Cloudflare Workers AI]    [Claude Code & Cursor]
             │                            │                          │
      HTTP POST /api/mcp           SSE /api/mcp/sse          stdio: conv mcp
             │                            │                          │
             └────────────────────────────┼──────────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │   Convergence Cloudflare MCP Router   │
                      │        (JSON-RPC 2.0 Protocol)        │
                      └──────────────────┬────────────────────┘
                                         ▼
                      ┌───────────────────────────────────────┐
                      │  Durable Object Actor: RepoBrain.ts   │
                      │   - AST-CRDT Commutative Lattice      │
                      │   - Edit-Time Leases & Backpressure   │
                      │   - Git Notes CoT (refs/notes/)       │
                      │   - SQLite WAL & Artifacts CAS        │
                      └───────────────────────────────────────┘
```

### Triple-Mode Transport

1. **Web-Native HTTP JSON-RPC (`POST /api/mcp`)**:
   Agents in Google Antigravity, Cloudflare Workers AI, or LangChain send standard JSON-RPC 2.0 requests directly over the internet:
   ```bash
   curl -s -X POST http://localhost:3000/api/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"convergence_status","arguments":{"json":true}}}'
   ```

2. **Streaming Server-Sent Events (`GET /api/mcp/sse`)**:
   Agents establish long-lived streaming sessions for real-time repository events.

3. **Local CLI stdio (`node ./bin/conv.mjs mcp`)**:
   For local developer tools like Claude Code, Cursor, and Cline:
   ```bash
   claude mcp add convergence node ./bin/conv.mjs mcp
   ```

---

## 3. 🛠️ The 11 Standardized MCP Tools

| MCP Tool | Purpose | Autonomous Agent Workflow |
| :--- | :--- | :--- |
| `convergence_status` | Repo state, active leases, Lamport clock | Agent inspects live mainline state before planning. |
| `convergence_read_file` | Read source from Artifacts CAS | Agent reads verified snapshot with zero clone overhead. |
| `convergence_list_symbols` | Parse AST symbols (functions, types) | Agent identifies target functions without regex parsing. |
| `convergence_acquire_lease` | **Acquire edit-time symbol lease** | **Prevents token waste.** If another agent holds the lock, immediate Semantic Backpressure triggers. |
| `convergence_release_lease` | Release held symbol lease | Releases lock so subsequent agents can proceed. |
| `convergence_push_symbol` | **Graft AST symbol into mainline** | Mathematical CRDT merge (0 conflicts) + writes Chain-of-Thought into `refs/notes/agent-provenance`. |
| `convergence_open_reverse_pr` | **Open Reverse Pull Request** | Agent asks human architect for 1-click strategic direction when encountering design trade-offs. |
| `convergence_create_repo` | Provision new edge repository | Agent initializes independent micro-repos on demand. |
| `convergence_list_repos` | List all edge repositories | Swarm discovers peer microservices. |
| `convergence_commit_file` | Direct full-file commit | Commits whole files with AST merge arbitration. |
| `convergence_run_cli` | Execute arbitrary `conv` CLI command | Direct CLI execution gateway for terminal agents. |
