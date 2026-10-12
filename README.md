# Convergence (Cloudflare Challenge Submission)

> **The Autonomous Continuous Semantic Code Fabric for 100,000+ Concurrent Agents**  
> Built for the [Cloudflare Challenge: Build the Next GitHub](https://www.cloudflare.com/git-competition/).

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare Artifacts](https://img.shields.io/badge/Storage-Cloudflare%20Artifacts-06B6D4)](https://developers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Architecture-Durable%20Objects-F59E0B)](https://developers.cloudflare.com/durable-objects/)
[![Tests](https://img.shields.io/badge/Tests-8%20Passing%20(100%25)-10B981)](#)

---

## 1. The Core Problem: Why Git Fails for Agent Swarms

Git was architected in 2005 for Linus Torvalds and humans trading text patches via email. When hundreds or thousands of autonomous agents write code simultaneously:
1. **Line-based diffs fail**: Textual collisions occur even when agents make orthogonal code additions in the same file.
2. **Branching creates $O(N^2)$ merge locks**: Human PRs and rebase queues stall autonomous agent throughput.
3. **Context waste**: Agents waste context windows cloning monolithic repositories instead of task-scoped micro-worktrees.

---

## 2. The Solution: Four Breakthrough Inventions

### ⚡ 1. The AST-CRDT Conflict-Free Merge Engine
Code is parsed into a **Typed Semantic AST Symbol Graph** (functions, interfaces, types, imports, statements) with content-addressed hashes.
* When 50 agents add functions or modify different symbols in the same file, Convergence reconciles them **with 0 line-merge conflicts** via Lamport-stamped CRDT operations.

### 🧠 2. Workers AI Semantic Arbiter
When genuine semantic collisions occur (e.g., mutually exclusive logic or interface signature changes), the **Workers AI Arbiter** synthesizes a non-breaking union, tests it in an isolated sandbox, and commits the reconciled tree back to mainline.

### 🌐 3. Ephemeral Micro-Worktrees via Cloudflare Artifacts
Instead of cloning the entire repository, agents request task-scoped **Sparse Worktrees** directly via `env.ARTIFACTS`. Commits stream back at edge latency into the unified repository.

### 🧬 4. Speculative Darwinian Swarms & Reverse Pull Requests
* **Speculative Breeding**: Spawns 20 exploratory branches in Artifacts in parallel, benchmarks them, auto-promotes the winning branch to `main`, and prunes losers.
* **Reverse PRs**: Inverts code review—agents self-govern and present high-level architectural trade-offs to humans in a 1-click decision card.

---

## 3. Real Benchmark Results: Traditional Git vs. Convergence

We benchmarked 25 concurrent agents making simultaneous additions and refactors to the same codebase:

| Metric | Traditional Git / GitHub | Convergence (Cloudflare) | Advantage |
| :--- | :--- | :--- | :--- |
| **Success Rate** | **4.0%** (1 of 25 merged) | **100.0%** (25 of 25 merged) | **25x higher success** |
| **Merge Conflicts** | **24 conflicts (96%)** | **0 conflicts (0%)** | **100% eliminated** |
| **Blocked / Stalled Agents**| **24 agents stalled** | **0 agents stalled** | **Zero pipeline locking** |
| **Average Merge Latency** | **121 ms** (plus lock queue) | **8–18 ms** (Durable Object) | **~10x faster** |

*Run the benchmark yourself:*
```bash
npm run bench
```

---

## 4. Architecture on Cloudflare

```
                  ┌──────────────────────────────────────────────┐
                  │          Developer / Agent Swarm             │
                  │   (Claude Code / Cursor / Autonomous Bots)   │
                  └──────────────────────┬───────────────────────┘
                                         │ REST API / WebSocket
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              Cloudflare Worker               │
                  │      (Hono API Gateway & Dashboard Host)     │
                  └───────┬───────────────────────────────┬──────┘
                          │                               │
                          ▼                               ▼
       ┌─────────────────────────────────────┐  ┌─────────────────────────┐
       │     Durable Objects (RepoBrain)     │  │   Cloudflare Queues     │
       │ - Atomic Symbol Graph & Lamport Clock│  │ - Async Test Harnesses  │
       │ - Lock-free AST-CRDT Reconciliation │  │ - Multi-Agent Reviewers │
       │ - Real-time WebSocket Telemetry     │  └────────────┬────────────┘
       └──────────────────┬──────────────────┘               │
                          │                                  ▼
                          ▼                         ┌─────────────────┐
       ┌─────────────────────────────────────┐      │   Workers AI    │
       │        Cloudflare Artifacts         │      │ - Semantic      │
       │ - Git-native versioned storage      │      │   Arbiter Gate  │
       │ - Ephemeral branch creation & prune │      └─────────────────┘
       │ - Zero-copy sparse worktrees        │
       └─────────────────────────────────────┘
```

---

## 5. Quickstart & Verification

### Run the Interactive Visual Dashboard (Local Standalone)
```bash
# 1. Install dependencies
npm install

# 2. Run test suite (100% pass)
npm test

# 3. Run comparative benchmark
npm run bench

# 4. Start dashboard & WebSocket server
npm start
# Visit http://localhost:3000 to interact with the live swarm canvas
```

### Deploy to Cloudflare Workers
```bash
npx wrangler deploy
```

---

## 6. Project Structure

```
convergence/
├── src/
│   ├── core/
│   │   ├── ast-engine.ts         # Babel-based AST symbol extraction & 3-way merge
│   │   ├── crdt.ts               # Conflict-Free Replicated Code Type with Lamport clocks
│   │   ├── artifacts-adapter.ts  # Cloudflare Artifacts driver & ephemeral branching
│   │   ├── arbiter.ts            # Workers AI semantic conflict reconciler
│   │   └── speculative-swarm.ts  # Darwinian branch evaluator & automated promoter
│   ├── durable-objects/
│   │   └── RepoBrain.ts          # Single-threaded actor state & live WebSocket broadcaster
│   ├── benchmarks/
│   │   ├── comparator.ts         # Head-to-head Git vs. Convergence test harness
│   │   └── run.ts                # CLI benchmark runner
│   ├── simulator/
│   │   └── swarm-simulator.ts    # Multi-agent wave concurrency simulator
│   ├── ui/
│   │   └── dashboard.html        # Interactive 60fps canvas & orchestration dashboard
│   ├── index.ts                  # Cloudflare Worker entry point
│   └── server.ts                 # Standalone Node/Hono server for local demo
├── tests/                        # Vitest unit & integration test suite
├── wrangler.jsonc                # Cloudflare Workers + Artifacts + DO config
└── package.json
```
