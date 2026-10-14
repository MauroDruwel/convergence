# 🏗️ Systems Architecture & Deep Dive

Convergence rethinks version control from the ground up for the autonomous AI agent era. Instead of treating software repositories as dumb text streams coordinated by file locks, Convergence models a codebase as a **continuous, semantically typed symbol graph** executed at edge latency on **Cloudflare Workers**, **Durable Objects with SQLite WAL**, and **Cloudflare Artifacts (CAS)**.

---

## 1. The Core Innovation: AST-CRDT Conflict-Free Engine

Traditional Git compares text line-by-line using algorithms like Myers diff and 3-way text merge (`GNU diff3`). When two agents append independent functions to the end of the same file, line numbers collide and trigger false merge conflicts.

```
       [AST Symbol Root: index.ts]
               /        \
              /          \
  [func:calculateTax]    [func:formatCurrency]
     (Agent Alpha)           (Agent Beta)
           \                 /
            \               /
   [Commutative CRDT Union at Edge DO SQLite]
           --> 0 MERGE CONFLICTS <--
```

### Mathematical Formulation
Convergence decomposes TypeScript and JavaScript source files into an addressable **Symbol Graph** using `@babel/parser`:
- Every AST node has an address: `func:calculateTax`, `interface:PaymentConfig`, `type:OrderState`.
- Edits are modeled as atomic CRDT operations:
  $$\text{Op} = \langle \text{id}, \text{type}, \text{filename}, \text{symbolId}, \text{symbolNode}, \text{agentId}, \text{lamportClock}, \text{wallClock} \rangle$$
- Disjoint symbol additions are commutative:
  $$\text{Merge}(A, B) = A \cup B = \text{Merge}(B, A)$$
- Competing mutations on the *same* symbol resolve deterministically using Lamport scalar causality:
  $$(L_A, \text{agent}_A) > (L_B, \text{agent}_B) \iff L_A > L_B \lor (L_A = L_B \land \text{agent}_A > \text{agent}_B)$$

---

## 2. 🥊 Why "Branch-per-Task" (Other Platforms) Breaks

Most other prototypes attempting to solve AI collaboration take the traditional approach:
> *"Every time an agent receives a prompt, spawn an isolated Git branch or repository fork."*

While intuitive for human workflows, **branch-per-task collapses under agent swarm concurrency:**

| Failure Mode | What Happens When 50 AI Agents Run Concurrently |
| :--- | :--- |
| **The PR Merge Avalanche** | 50 agents open 50 PRs simultaneously. The instant Agent #1 merges into `main`, the remaining 49 branches are now out-of-date and trigger line-based `diff3` conflicts. |
| **The Rebase Doom-Loop** | Agents get trapped in endless rebase queues, spending hundreds of dollars in LLM tokens rewriting rejected diffs against a moving mainline. |
| **Zero Edit-Time Awareness** | Because branches are isolated, Agent Beta has no idea Agent Alpha is refactoring `processPayment()` until 20 minutes later when their PRs collide. |
| **Branch Sprawl & Lock Contention** | Spawning 100 branches per hour creates massive git index lock contention and thousands of dead branches cluttering the remote. |

### How Convergence Wins: The Branchless Semantic Fabric
1. **Direct AST Grafting**: Changes merge directly into the edge graph with mathematical commutativity.
2. **Proactive Symbol Leases**: Conflicts are prevented *before* an agent invokes its LLM, not discovered at PR review time.
3. **Zero Rebase Waste**: No stale branches, no rebase storms, and zero wasted LLM tokens.

---

## 3. The 5 Core Breakthroughs

### Breakthrough 1: Edit-Time Symbol Leases & Semantic Backpressure
Why wait until merge time to discover a collision?
- When an agent begins editing `func:processPayment`, it calls `POST /api/leases/request` to claim a 15-second TTL lease directly from the Durable Object.
- If a competing agent attempts to edit the same function, it immediately receives `HTTP 423 Locked` + **Semantic Backpressure** *before* generating 400 lines of code, saving thousands of LLM tokens.
- The Durable Object manages lease expirations deterministically via `ctx.storage.setAlarm(expiresAt)`.

### Breakthrough 2: Autonomous Code Immune System
AI models frequently write code that compiles cleanly but omits critical boundary checks (e.g. allowing negative transfer amounts).
- Every commit passes through an autonomous red-team fuzzer that probes numeric boundaries (`[-99999, 0, NaN]`).
- If an unhandled boundary error is discovered, the **Antibody Splicer** automatically synthesizes and splices a runtime guard (`if (amount <= 0) throw new RangeError(...)`) directly into the AST node before reaching mainline.

### Breakthrough 3: Chrono-Revert (Surgical AST Rollback)
In traditional Git, reverting a faulty commit (`git revert`) rolls back whole file diffs and creates merge conflicts with subsequent commits.
- Convergence performs **Surgical AST Rollback**: rolls back only the offending symbol in the CRDT graph while leaving all other concurrent agent additions completely untouched.

### Breakthrough 4: Reverse Pull Requests (RPR)
Humans cannot review 5,000 pull requests per hour. But AI agents should not make unilateral architectural decisions either.
- Agents review and auto-merge each other's routine code.
- When an agent encounters an architectural dilemma (e.g., choosing storage trade-offs between D1 SQLite and in-memory cache), it opens a **Reverse Pull Request**.
- The human architect receives a 1-click decision card in the dashboard. One click unblocks the entire swarm.

### Breakthrough 5: Git Notes Chain-of-Thought Provenance (`refs/notes/`)
Where did the code come from? Which model wrote it? What was its prompt?
- Rather than polluting commit SHA hashes or polluting file comments, Convergence writes full model IDs, prompts, and reasoning steps into standard Git Notes under `refs/notes/agent-provenance`.
- 100% native to Git, accessible via standard `git notes show`.

---

## 4. Cloudflare Edge Architecture

![Convergence Architecture](../assets/architecture-diagram.svg)

1. **Cloudflare Workers (Hono Edge Router)**:
   - Global routing with sub-millisecond cold starts across 330+ edge data centers.
   - Handles HTTP REST, WebSocket duplex connections, and Cloudflare MCP endpoints.
2. **Durable Objects (`RepoBrain`) with SQLite WAL**:
   - Single-threaded transactional coordinator per repository.
   - Transactional SQLite engine with Write-Ahead Logging (WAL) ensures atomic symbol operations, Lamport ordering, and lease states.
3. **Cloudflare Artifacts (`env.ARTIFACTS`)**:
   - High-throughput Content-Addressed Storage (CAS) storing immutable code snapshots and Merkle trees.
   - Enables zero-copy hydration and instant worktree branching.
