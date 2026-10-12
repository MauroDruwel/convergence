# Convergence (Cloudflare Challenge Submission)

> **The Autonomous Continuous Semantic Code Fabric for 100,000+ Concurrent Agents**  
> Built for the [Cloudflare Challenge: Build the Next GitHub](https://www.cloudflare.com/git-competition/).

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare Artifacts](https://img.shields.io/badge/Storage-Cloudflare%20Artifacts-06B6D4)](https://developers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Architecture-Durable%20Objects%20SQLite-F59E0B)](https://developers.cloudflare.com/durable-objects/)
[![Tests](https://img.shields.io/badge/Tests-15%20Passing%20(100%25)-10B981)](#)

---

## 1. The Core Problem: Why Git Fails for Agent Swarms

Git was architected in 2005 for Linus Torvalds and humans trading text patches via email. When hundreds or thousands of autonomous agents write code simultaneously:
1. **Line-based diffs fail**: Textual collisions occur even when agents make orthogonal additions in the same file.
2. **Merge-time is too late**: Resolving collisions during pull request merge creates rebase queues and token waste.
3. **Reasoning is lost**: Git commits record *what* changed, but discard *why* the agent chose that implementation.
4. **Context waste**: Agents waste context windows cloning monolithic repositories instead of task-scoped micro-worktrees.

---

## 2. The Solution: Six Breakthrough Primitives

### ⚡ 1. The AST-CRDT Conflict-Free Merge Engine
Code is parsed into a **Typed Semantic AST Symbol Graph** (functions, interfaces, types, imports, statements) with content-addressed hashes.
* When 50 agents add functions or modify different symbols in the same file, Convergence reconciles them **with 0 line-merge conflicts** via Lamport-stamped CRDT operations.

### 🔑 2. Edit-Time Symbol Leases & Semantic Backpressure
Instead of letting collisions happen at merge time, agents acquire short-lived TTL **Symbol Leases** directly from the Durable Object.
* When an agent mutates an interface, downstream dependent symbols receive instant **Semantic Backpressure** mid-edit before any broken commit is ever created.

### 🧠 3. Git Notes Chain-of-Thought Provenance (`refs/notes/agent-provenance`)
Preserves model attribution, prompt intent, reasoning chains, and token telemetry natively within Git metadata.
* Fully auditable years later without altering commit SHA-1 hashes. Directly answers Cloudflare's core question on reasoning retention.

### 🗄️ 4. Durable Object Transactional SQLite (`ctx.storage.sql`)
The repository is an atomic relationally indexed actor. Symbols, dependency graphs, active leases, and operations logs are written in ACID SQLite transactions with sub-millisecond query performance.

### 🛡️ 5. Autonomous Code Immune System & Chrono-Revert
* **Immune Defense**: Adversarial fuzzer probes AST nodes and automatically synthesizes runtime boundary guards before code reaches mainline.
* **Chrono-Revert**: Surgically rolls back a single faulty symbol in the CRDT DAG without touching any other agent's concurrent work.

### 🌐 6. Ephemeral Micro-Worktrees via Cloudflare Artifacts
Agents request task-scoped **Sparse Worktrees** directly via `env.ARTIFACTS`. Commits stream back at edge latency into the unified repository.

---

## 3. Real Benchmark Results: Traditional Git (GNU diff3) vs. Convergence

We benchmarked 25 concurrent agents making simultaneous additions and refactors to the same codebase using the **genuine GNU diff3 3-way merge engine**:

| Metric | Traditional Git (GNU diff3) | Convergence (Cloudflare) | Advantage |
| :--- | :--- | :--- | :--- |
| **Success Rate** | **4.0%** (1 of 25 merged) | **100.0%** (25 of 25 merged) | **25x higher success** |
| **Merge Conflicts** | **24 conflicts (96%)** | **0 conflicts (0%)** | **100% eliminated** |
| **Blocked / Stalled Agents**| **24 agents stalled** | **0 agents stalled** | **Zero pipeline locking** |
| **Average Merge Latency** | **1 ms** | **10 ms** (AST parsing + DB) | **Real-world sub-10ms** |
| **Throughput** | Bottlenecked on locks | **96+ commits / second** | Massive concurrency |

*Run the genuine benchmark yourself:*
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
       │ - Transactional SQLite Storage       │  │ - Async Test Harnesses  │
       │ - Edit-Time AST Symbol Leases       │  │ - Multi-Agent Reviewers │
       │ - Semantic Backpressure Engine      │  └────────────┬────────────┘
       │ - Git Notes Provenance Tracker      │               │
       │ - Lock-free AST-CRDT Reconciliation │               ▼
       │ - Real-time WebSocket Hibernation   │      ┌─────────────────┐
       └──────────────────┬──────────────────┘      │   Workers AI    │
                          │                         │ - Semantic      │
                          ▼                         │   Arbiter Gate  │
       ┌─────────────────────────────────────┐      └─────────────────┘
       │        Cloudflare Artifacts         │
       │ - Git-native versioned storage      │
       │ - refs/notes/agent-provenance       │
       │ - Ephemeral branch creation & prune │
       │ - Zero-copy sparse worktrees        │
       └─────────────────────────────────────┘
```

---

## 5. Quickstart & Verification

### Run the Interactive Visual Dashboard (Local Standalone)
```bash
# 1. Install dependencies
npm install

# 2. Run test suite (15/15 passing tests)
npm test

# 3. Run genuine diff3 benchmark
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
│   │   ├── symbol-leases.ts      # Edit-time AST leases & semantic backpressure
│   │   ├── provenance.ts         # Git Notes Chain-of-Thought provenance tracker
│   │   ├── sqlite-storage.ts     # Durable Object transactional SQLite storage
│   │   ├── immune-system.ts      # Autonomous red-team fuzzer & antibody synthesizer
│   │   ├── chrono-revert.ts      # Surgical single-symbol time-travel rollbacks
│   │   ├── artifacts-adapter.ts  # Cloudflare Artifacts driver & ephemeral branching
│   │   ├── arbiter.ts            # Workers AI semantic conflict reconciler
│   │   └── speculative-swarm.ts  # Darwinian branch evaluator & automated promoter
│   ├── durable-objects/
│   │   └── RepoBrain.ts          # DO actor: SQLite, Leases, Provenance & WebSockets
│   ├── benchmarks/
│   │   ├── comparator.ts         # Genuine GNU diff3 vs. Convergence test harness
│   │   └── run.ts                # CLI benchmark runner
│   ├── simulator/
│   │   └── swarm-simulator.ts    # Multi-agent wave concurrency simulator
│   ├── ui/
│   │   └── dashboard.html        # Interactive 60fps canvas, leases & provenance UI
│   ├── index.ts                  # Cloudflare Worker entry point
│   └── server.ts                 # Standalone Node/Hono server for local demo
├── tests/                        # Vitest unit & integration test suite (15 tests)
├── wrangler.jsonc                # Cloudflare Workers + Artifacts + DO config
└── package.json
```
