# Convergence (Cloudflare Challenge Submission)

> **The Autonomous Semantic Code Fabric for 100,000+ Concurrent AI Agents**  
> Built for the [Cloudflare Challenge: Build the Next Git Platform](https://www.cloudflare.com/git-competition/).  
> **Author:** Mauro Druwel ([@MauroDruwel](https://github.com/MauroDruwel))

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare Artifacts](https://img.shields.io/badge/Storage-Cloudflare%20Artifacts-06B6D4)](https://developers.cloudflare.com/)
[![Durable Objects](https://img.shields.io/badge/Architecture-Durable%20Objects%20SQLite-F59E0B)](https://developers.cloudflare.com/durable-objects/)
[![Tests](https://img.shields.io/badge/Tests-25%20Passing%20(100%25)-10B981)](#)
[![E2E Browser Tests](https://img.shields.io/badge/Puppeteer%20E2E-10%2F10%20Verified-10B981)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ⚡ Try the Interactive Console in 30 Seconds

Experience the 5-level interactive engineering quest locally:

```bash
git clone https://github.com/MauroDruwel/convergence.git
cd convergence
npm install
npm run demo
```

👉 Open **http://localhost:3000** in your browser.

You can click through the 5 interactive engineering levels (or press **▶ Auto-Play Tour**) to break Git with 25 agents, inspect the AST-CRDT engine, acquire symbol leases, trigger an adversarial probe against the code immune system, and resolve a Reverse Pull Request live.

![Convergence Console](assets/dashboard-console.png)

*Full-height dashboard inspection including live unified codebase viewer, active leases, Git Notes provenance, and WebSocket event stream:*
![Convergence Full Console](assets/dashboard-full.png)

---

## 💡 The Core Context: Why Git Breaks for AI Swarms

Git was designed in 2005 for humans emailing text patches to each other. Git has zero semantic understanding of software; it only sees raw line numbers and text strings (`diff3`).

When autonomous AI agents work concurrently:
* **Line-based merges fail**: If Agent A adds a function at line 12 and Agent B adds a function at line 13, Git throws a merge conflict — even though the functions are completely independent.
* **Tokens are wasted**: In real benchmarks, **96% of concurrent agent commits fail** in Git. Agents get stuck in infinite rebase queues and burn expensive LLM tokens rewriting rejected diffs.
* **Code is a tree, not text**: Code is naturally an **Abstract Syntax Tree (AST)** of functions, interfaces, and types. 

**Convergence rethinks the Git repository as a live semantic symbol graph** coordinated at edge latency using **Cloudflare Workers**, **Cloudflare Artifacts**, and **Durable Objects with transactional SQLite**.

---

## 🎮 The 5 Interactive Engineering Breakthroughs

These 5 primitives are demonstrated live in the interactive console (`http://localhost:3000`):

### 1. Level 1: The AST-CRDT Conflict-Free Merge Engine
Instead of line diffs, Convergence decomposes TypeScript/JavaScript files into semantic symbols (`func:calculateTax`, `interface:PaymentConfig`). Merges happen at the AST node level using Lamport-stamped CRDT operations.
* **Result**: 25 agents can simultaneously add functions and interfaces to the exact same file with **100% success rate and 0 merge conflicts**.

### 2. Level 2: Real-Time Edge Radar & Artifacts Storage
A single Durable Object (`RepoBrain`) acts as the stateful SQLite actor, backed by `env.ARTIFACTS` for content-addressed snapshot storage.
* Visualizes active agent orbits, commit streams, and Lamport scalar sequence counters in real time at sub-10ms latency.

### 3. Level 3: Edit-Time Symbol Leases & Semantic Backpressure
Why wait until merge time to discover a collision? When an agent begins refactoring a function, it acquires a short-TTL **Symbol Lease** directly from the Durable Object.
* When another agent attempts to edit the same function, it receives immediate **Semantic Backpressure** *before* generating code, saving thousands of LLM tokens.

### 4. Level 4: Code Immune System & Chrono-Revert
AI agents frequently write code that compiles cleanly but misses boundary checks (e.g. allowing negative withdrawals).
* **Immune Defense**: An autonomous red-team fuzzer probes AST nodes and automatically synthesizes runtime boundary guards (`if (amount <= 0) throw new RangeError(...)`) before code reaches mainline.
* **Chrono-Revert**: Surgically rolls back a single faulty AST symbol without touching any other agent's concurrent work.

### 5. Level 5: Reverse Pull Requests & CoT Provenance
Humans cannot review 5,000 PRs per hour. But agents shouldn't make unilateral architecture decisions either.
* **Reverse PRs**: Agents review code among themselves, but open a Reverse PR to ask a human for high-level architectural steering (e.g., choosing storage trade-offs). One click unblocks the swarm.
* **CoT in Git Notes (`refs/notes/agent-provenance`)**: Model IDs, reasoning chains, and telemetry are stored in standard Git Notes. 100% native to Git, preserving why code was written without changing commit SHA hashes.

---

## 📊 Empirical Benchmark: Genuine GNU diff3 vs. Convergence

Tested by spawning 25 concurrent agents making simultaneous additions and refactors to the same codebase using the **genuine GNU diff3 3-way merge engine**:

| Metric | Traditional Git (GNU diff3) | Convergence (Cloudflare) | Advantage |
| :--- | :--- | :--- | :--- |
| **Success Rate** | **4.0%** (1 of 25 merged) | **100.0%** (25 of 25 merged) | **25x higher success** |
| **Merge Conflicts** | **24 conflicts (96%)** | **0 conflicts (0%)** | **100% eliminated** |
| **Blocked / Stalled Agents** | **24 agents stalled** | **0 agents stalled** | **Zero pipeline locking** |
| **Average Merge Latency** | **1 ms** | **10 ms** (AST parsing + DB) | **Real-world sub-10ms** |
| **Throughput** | Bottlenecked on file locks | **96+ commits / second** | Massive edge concurrency |

```bash
# Run the genuine benchmark in your terminal
npm run bench
```

### 100,000 Agent Scale Harness
Convergence includes a dedicated high-throughput stress test harness (`src/benchmarks/stress-100k.ts`) to evaluate swarms scaling up to 100,000 agents:
* **Tested at 5,000 concurrent agents**: 60 commits/sec, 86 MB settled memory, 100% clean AST merges, verified 100% syntactically valid TypeScript via `@babel/parser`.

```bash
# Run default 5,000 agents
npm run bench:100k

# Or test with 100,000 agents
AGENTS=100000 npm run bench:100k
```

---

## 🏗️ Cloudflare Edge Architecture

![Convergence Architecture](assets/architecture-diagram.svg)

* **Cloudflare Workers**: High-performance HTTP and WebSocket routing at the edge.
* **Durable Objects (SQLite)**: Stateful actor managing symbol graphs, ACID transaction logs, Lamport causality, and active leases.
* **Cloudflare Artifacts (`env.ARTIFACTS`)**: Content-addressed snapshot and worktree storage.
* **Git Wire Protocol**: Native compatibility with Git clients via standard `refs/notes/`.

---

## 🧪 Verification & Test Suite

The entire codebase is strictly typed and covered by 25 unit, integration, and browser E2E tests:

```bash
# 1. TypeScript strict typecheck (0 errors)
npm run typecheck

# 2. Complete test suite (25/25 passing)
npm test

# 3. Puppeteer browser E2E test suite (10/10 verified actions against Chromium)
npm run test:e2e
```

---

## 🚀 Cloudflare Deployment

```bash
npx wrangler deploy
```

---

## License

MIT © Mauro Druwel
