    const NOVA_DECKS = {
      welcome: [
        {
          badge: "LAUNCHPAD",
          title: "The 100,000-Agent Bottleneck",
          text: "<strong>In plain terms:</strong> Git treats source code like a flat notepad of numbered lines. That worked in 2005 for humans, but when dozens of AI agents write code at the exact same second, they step on each other's line numbers.",
          primitive: "WORKERS + DO + ARTIFACTS",
          issue: "Legacy Git (GNU diff3) locks & conflicts on raw text line numbers when AI swarms push in parallel.",
          solution: "Engineered Convergence: an AST-symbol-native code platform built for autonomous agent swarms.",
          cfPort: "Ported to Cloudflare Workers, Durable Objects SQLite, and env.ARTIFACTS for ~10ms edge execution.",
          eng: "CF_SPEC // Benchmarking GNU diff3 line-hunk matching vs commutative AST-CRDTs on Cloudflare Workers + DO SQLite.",
          spawnId: "launch-standby-card"
        },
        {
          badge: "INITIALIZE",
          title: "How This Proving Ground Works",
          text: "<strong>Your mission:</strong> In each stage, you will see the <strong>Issue</strong> in traditional Git/CI, the <strong>Solution</strong> we integrated into our portal, and <strong>How Cloudflare Ports It</strong> at the edge. Verify all 5 to unlock the full <strong>Convergence</strong> portal.",
          primitive: "5 EDGE PRIMITIVES",
          issue: "Centralized repos suffer from 500MB clones, diff3 crashes, wasted LLM tokens, and slow 5-min CI.",
          solution: "5 integrated portal modules: AST-CRDTs, DO Sequencer, Symbol Leases, Immune Sentinel, and Reverse PRs.",
          cfPort: "Each module maps 1:1 to a Cloudflare edge primitive (V8 Isolates, DO SQLite, DO Alarms, Hibernatable WS).",
          eng: "CF_SPEC // Click the orange Next (▶) icon in my header to initialize Stage 01.",
          spawnId: "tab-btn-benchmark"
        }
      ],
      1: [
        {
          badge: "STAGE 01 · THE SETUP",
          title: "Why I Integrated the AST-CRDT Merge Engine",
          text: "<strong>Simple picture:</strong> Imagine 25 chefs each trying to add their own new recipe to the bottom of the same notebook page at the exact same second. None of them are editing the same recipe, they are just writing at the bottom of the page.",
          primitive: "V8 ISOLATES + ARTIFACTS",
          issue: "25 agents appending 25 separate functions to `index.ts` share the same EOF line anchor (line 78).",
          solution: "Integrated an AST-CRDT parser that addresses code by symbol (`func:handleRefund_1`) instead of line numbers.",
          cfPort: "Cloudflare Workers V8 Isolates parse AST nodes in <2ms and graft them into `env.ARTIFACTS` Merkle trees.",
          eng: "CF_SPEC // 25 agents fork base commit SHA (78 lines) and append 25 orthogonal top-level FunctionDeclarations.",
          spawnId: "section-benchmark"
        },
        {
          badge: "STAGE 01 · EXECUTE",
          title: "Run the Experiment: Engine A vs Engine B",
          text: "<strong>What to watch:</strong> Both engines are currently in neutral standby. Press the green <strong>▶ Play</strong> icon in my bar (or the button on the card) to fire all 25 commits at once and see how both engines react!",
          primitive: "AST-CRDT LATTICE",
          issue: "Engine A (Standard Git diff3) evaluates Longest Common Subsequence text lines after line 78.",
          solution: "Engine B (Convergence Portal) evaluates commutative AST symbol declarations keyed by Lamport clocks.",
          cfPort: "Durable Object sequences all 25 AST grafts in a single atomic turn without a single `git rebase`.",
          eng: "CF_SPEC // Engine A runs 3-way GNU diff3. Engine B runs state-based AST-CRDT keyed by Lamport (L, AgentID).",
          ctaTip: "Execute 25-Agent Test",
          spawnId: "duel-arena"
        }
      ],
      2: [
        {
          badge: "STAGE 02 · THE SETUP",
          title: "Why I Integrated the Single-Threaded Edge Sequencer",
          text: "<strong>Simple picture:</strong> Instead of 8 agents fighting over a shared database with slow locks, one ultra-fast air-traffic controller sits at the center and lines up every incoming plane in milliseconds.",
          primitive: "DURABLE OBJECT SQLITE",
          issue: "Centralized Git backends (Postgres/Redis) stall under Two-Phase Commit (2PC) lock contention during swarm waves.",
          solution: "Integrated `RepoBrain`: a lock-free causal sequencer that orders every agent push via Lamport clocks (`L`).",
          cfPort: "Cloudflare Durable Objects guarantee single-threaded actor execution co-located with embedded SQLite WAL (~10ms).",
          eng: "CF_SPEC // Each repo maps 1:1 to `REPO_BRAIN.idFromName(repo)` with co-located SQLite + `env.ARTIFACTS`.",
          spawnId: "section-overview"
        },
        {
          badge: "STAGE 02 · EXECUTE",
          title: "Dispatch the 8-Agent Specialist Wave",
          text: "<strong>What to watch:</strong> Hit the green <strong>▶ Play</strong> icon to dispatch 8 specialist agents simultaneously. Watch their beams hit the Durable Object core and watch the live `index.ts` file below grow in real time!",
          primitive: "WS HIBERNATION + DO",
          issue: "Cloning a 500MB repo per agent takes seconds and saturates network bandwidth.",
          solution: "Agents branch zero-copy merkle pointers and stream AST mutations over persistent WebSockets.",
          cfPort: "`state.acceptWebSocket()` + `env.ARTIFACTS` let 8 Worker agents commit into one Durable Object in ~10ms.",
          eng: "CF_SPEC // Agents stream AST operations over Hibernatable WebSockets. Each commit increments scalar `L`.",
          ctaTip: "Dispatch 8-Agent Wave",
          spawnId: "radar-wrap"
        }
      ],
      3: [
        {
          badge: "STAGE 03 · THE SETUP",
          title: "Why I Integrated Edit-Time Symbol Leases",
          text: "<strong>Simple picture:</strong> AST merges solve separate functions. But what if two agents try to rewrite `processOrder()` at the exact same moment? If we let both finish writing and reject one later, we just burned $2 of AI compute for nothing.",
          primitive: "DO ALARMS + HTTP 423",
          issue: "Post-merge conflict detection happens AFTER competing agents already burned thousands of LLM output tokens.",
          solution: "Integrated an Edit-Time Symbol Lease table: agents claim a short TTL lock on `func:processOrder` BEFORE inference.",
          cfPort: "Durable Object in-memory lock table + `ctx.storage.setAlarm(ttl)` arbitrates locks in <1ms and auto-evicts on expiry.",
          eng: "CF_SPEC // Pre-inference coordination: agents call `POST /api/leases/request` before invoking LLM generation.",
          spawnId: "section-leases"
        },
        {
          badge: "STAGE 03 · EXECUTE",
          title: "Trigger the T+600ms Collision Trap",
          text: "<strong>What to watch:</strong> Press the green <strong>▶ Play</strong> icon. `agent_security` will claim `func:processOrder` at T+0ms, and `agent_fraud` will try to claim it 600ms later. Watch what the runtime does!",
          primitive: "HTTP 423 BACKPRESSURE",
          issue: "`agent_fraud` wakes up 600ms later to refactor the exact same `func:processOrder` symbol.",
          solution: "Portal returns `HTTP 423 Locked` with `estimatedWaitMs`, pausing `agent_fraud` before it calls the LLM.",
          cfPort: "Single-threaded Durable Object memory guarantees zero race conditions on lock acquisition across the globe.",
          eng: "CF_SPEC // Durable Object Lock Table returns `HTTP 423 Locked` with `Retry-After` backpressure at 0 tokens spent.",
          ctaTip: "Simulate Same-Symbol Race",
          spawnId: "section-leases"
        }
      ],
      4: [
        {
          badge: "STAGE 04 · THE SETUP",
          title: "Why I Integrated the Pre-Merge Code Immune System",
          text: "<strong>Simple picture:</strong> AI agents are great at writing code that looks right and passes syntax checks, but forgets a basic safety rule, like a bank transfer function that allows negative numbers (`-$99,999`).",
          primitive: "DYNAMIC WORKER ISOLATE",
          issue: "Standard CI (`tsc`/ESLint) only checks types and takes 5 minutes—letting semantic logic bugs slip into mainline.",
          solution: "Integrated an inline Pre-Merge Immune Sentinel that boundary-fuzzes AST parameters and splices guard code.",
          cfPort: "Cloudflare Worker Isolates spin up in <4ms (0ms cold start) to fuzz incoming AST nodes inline during `POST /api/commit`.",
          eng: "CF_SPEC // Pre-merge Worker isolate sentinel fuzzes numeric/string invariants before persisting to `env.ARTIFACTS`.",
          spawnId: "section-immune"
        },
        {
          badge: "STAGE 04 · EXECUTE",
          title: "Push the Unvalidated Commit",
          text: "<strong>What to watch:</strong> Hit the green <strong>▶ Play</strong> icon to push the agent's flawed `transferFunds(amount)` function into the pre-merge gate and see how the repository defends itself!",
          primitive: "4ms AST ANTIBODY",
          issue: "Agent pushes `transferFunds(amount)` without checking `amount <= 0` (vulnerable to negative withdrawal exploit).",
          solution: "Sentinel probes `transferFunds(-99999)`, catches the breach, and auto-splices a `RangeError` guard into the AST.",
          cfPort: "Executed entirely at the Cloudflare edge in 4ms before the Durable Object commits the symbol to SQLite.",
          eng: "CF_SPEC // Boundary probe detects breach on `amount <= 0` and splices an AST `RangeError` antibody in 4ms.",
          ctaTip: "Push Unvalidated Commit",
          spawnId: "section-immune"
        }
      ],
      5: [
        {
          badge: "STAGE 05 · THE SETUP",
          title: "Why I Integrated Reverse PRs & Git Notes Provenance",
          text: "<strong>Simple picture:</strong> No human can read 5,000 AI Pull Requests a day. So in Convergence, agents merge routine code themselves and only open a <strong>Reverse PR</strong> to ask YOU when there is a big architectural choice.",
          primitive: "GIT NOTES + WS BROADCAST",
          issue: "Human PR review bottlenecks autonomous swarms, while standard Git commits lose AI Chain-of-Thought reasoning.",
          solution: "Integrated Reverse PRs (swarm escalates trade-offs to humans) + `refs/notes/agent-provenance` CoT logging.",
          cfPort: "Durable Object SQLite indexes Git Notes without mutating commit SHAs, while Hibernatable WS broadcasts human steering.",
          eng: "CF_SPEC // Routine AST commits log CoT to `refs/notes/agent-provenance`; architectural forks open a Reverse PR.",
          spawnId: "level-5-grid"
        },
        {
          badge: "STAGE 05 · EXECUTE",
          title: "Trigger & Resolve the Architectural Escalation",
          text: "<strong>What to watch:</strong> Press the green <strong>▶ Play</strong> icon to simulate `agent_architect` hitting a database trade-off, then click any option to steer the swarm and unlock the full <strong>Convergence</strong> platform!",
          primitive: "SWARM STEERING BUS",
          issue: "`agent_architect` encounters a storage trade-off (co-located DO SQLite vs distributed D1) and cannot guess.",
          solution: "Human Architect clicks 1 option in the portal to resolve the Reverse PR and unblock all waiting agents.",
          cfPort: "Durable Object broadcasts the resolution over hibernated WebSockets in <15ms and unlocks the full Portal.",
          eng: "CF_SPEC // Resolving the Reverse PR broadcasts the chosen policy vector across all hibernated agent WebSockets.",
          ctaTip: "Simulate Agent Escalation",
          spawnId: "section-rpr"
        }
      ],
      complete: [
        {
          badge: "ALL 5/5 VERIFIED",
          title: "Convergence // Full Portal & Architecture Matrix Unlocked",
          text: "<strong>You unlocked the entire stack:</strong> Every tab in this portal now shows the exact <strong>Issue → Solution → Cloudflare Edge Port</strong> rationale at the top, plus a full 6-module blueprint in the README card below.",
          primitive: "FULL EDGE PLATFORM",
          issue: "Legacy Git & centralized CI were never designed for 100,000 concurrent autonomous agents.",
          solution: "Complete edge-native repository portal with AST-CRDTs, Leases, Immune Sentinel, Reverse PRs & Agent SDK.",
          cfPort: "100% powered by Cloudflare Workers, Durable Objects SQLite, DO Alarms, WebSockets, and env.ARTIFACTS.",
          eng: "CF_SPEC // Explore every tab to see the Issue -> Solution -> Cloudflare Port banner and test the live Agent SDK.",
          spawnId: "platform-view",
          targetTab: "code"
        }
      ]
    };

    const NOVA_PAYOFFS = {
      1: {
        badge: "STAGE 01 VERIFIED ✓",
        title: "Surprise Reveal: Git Crashed 24/25 Times, Convergence Merged 25/25!",
        text: "<strong>Why did Git fail?</strong> Because all 25 agents wrote after line 78, Git's `diff3` thought 24 agents were overwriting the exact same line! Convergence saw 25 separate function names in the AST tree and grafted all 25 cleanly in 10ms.",
        primitive: "AST-CRDT VERIFIED",
        issue: "GNU diff3 failed 96% of commits (24/25 halted) due to EOF line-anchor collisions at line 78.",
        solution: "Portal's AST-CRDT engine parsed 25 distinct function symbols and merged 100% cleanly (0 conflicts).",
        cfPort: "Workers V8 Isolate + `env.ARTIFACTS` grafted all 25 AST nodes in 10ms. Click ▶ Next for Stage 02.",
        eng: "CF_SPEC // GNU diff3: 4% success. Convergence AST-CRDT: 100% success in 10ms. Click ▶ Next for Stage 02.",
        nextLevel: 2
      },
      2: {
        badge: "STAGE 02 VERIFIED ✓",
        title: "8 Concurrent Agent Commits Sequenced in ~10ms!",
        text: "<strong>What just happened:</strong> All 8 specialist agents streamed their functions into the central Durable Object. None of them needed to pull, rebase, or wait for a distributed database lock, and `index.ts` updated live below!",
        primitive: "DO_SQLITE VERIFIED",
        issue: "8 concurrent agents pushing to a traditional Postgres/Git server trigger lock contention and rebase loops.",
        solution: "Portal's `RepoBrain` sequencer ordered all 8 mutations atomically via monotonic Lamport timestamps.",
        cfPort: "Single-threaded Durable Object + co-located SQLite WAL serialized all 8 commits in ~10ms. Click ▶ Next.",
        eng: "CF_SPEC // Single-threaded Durable Object serialized 8 AST mutations into SQLite + `env.ARTIFACTS`.",
        nextLevel: 3
      },
      3: {
        badge: "STAGE 03 VERIFIED ✓",
        title: "HTTP 423 Backpressure Stopped the Collision at 0 Wasted Tokens!",
        text: "<strong>What just happened:</strong> When `agent_fraud` arrived 600ms late to edit `processOrder`, the repository told it to wait *before* it started generating code, saving 1,420 LLM tokens automatically.",
        primitive: "DO_ALARMS VERIFIED",
        issue: "`agent_fraud` tried to refactor `func:processOrder` while `agent_security` was already editing it.",
        solution: "Portal rejected the pre-inference handshake with `HTTP 423 Locked`, saving 1,420 LLM tokens.",
        cfPort: "Durable Object in-memory lock table + `setAlarm(12000)` enforced instant backpressure. Click ▶ Next.",
        eng: "CF_SPEC // `HTTP 423 Locked` returned at edit-time handshake with `TTL=12000ms` alarm. Zero wasted compute.",
        nextLevel: 4
      },
      4: {
        badge: "STAGE 04 VERIFIED ✓",
        title: "Exploit Caught & Healed in 4ms Before Merge!",
        text: "<strong>What just happened:</strong> The pre-merge fuzzer tested `transferFunds(-99999)`, saw it dangerously succeed, and automatically wrote + spliced the `if (amount <= 0) throw RangeError` guard into the function before merge!",
        primitive: "ISOLATE SENTINEL VERIFIED",
        issue: "Compilable code had a fatal negative-amount exploit (`transferFunds(-99999)`) that `tsc` missed.",
        solution: "Portal's Immune Sentinel caught the invariant breach pre-merge and spliced a `RangeError` antibody.",
        cfPort: "Dynamic Worker Isolate fuzzed and patched the AST node inline in 4ms before storage. Click ▶ Next.",
        eng: "CF_SPEC // Pre-merge AST sentinel intercepted CVE-SIM-01 and injected a synthetic `RangeError` guard in 4ms.",
        nextLevel: 5
      },
      5: {
        badge: "ALL 5 STAGES MASTERED 🎉",
        title: "Swarm Unblocked! Ready to Launch the Full Portal",
        text: "<strong>Mission accomplished:</strong> With a single click, you made the architectural decision and unblocked the entire AI swarm. Click the orange <strong>▶ Next</strong> icon to launch the full-screen <strong>Convergence</strong> portal!",
        primitive: "PORTAL UNLOCKED",
        issue: "Human architects can't review 5,000 PRs/day, but swarms need human steering on core architecture.",
        solution: "1-click Reverse PR resolution unblocked the swarm + logged full Chain-of-Thought to Git Notes.",
        cfPort: "Hibernatable WebSockets broadcast your decision in <15ms. Click ▶ Next to open the full Portal!",
        eng: "CF_SPEC // All 5 primitives verified. Click ▶ Next to launch the standalone Convergence Portal.",
        nextLevel: null
      }
    };

    const NOVA_DEEP_DIVES = {
      1: {
        title: "Module 01 Blueprint: AST-CRDT Merge Engine & Symbol Graph",
        runtime: "Cloudflare Workers V8 Isolates + env.ARTIFACTS Merkle CAS",
        sections: [
          {
            heading: "🔴 THE ISSUE: Why GNU diff3 Fails Under Agent Concurrency",
            detail: "Standard Git (`GNU diff3`) computes Longest Common Subsequence (LCS) line hunks against a base text file. When 25 agents append independent functions after line 78, commits 2..25 share the exact same `@@ -78,0 +79,4 @@` EOF line anchor, causing 24 unresolvable merge conflicts."
          },
          {
            heading: "🟢 THE SOLUTION: Why I Integrated AST-CRDTs Into the Portal",
            detail: "Convergence parses TypeScript files into an addressable AST Symbol Graph (`func:handleRefund_1`, `interface:PaymentConfig`). Disjoint symbol additions become commutative set unions, and same-symbol edits resolve deterministically via `(lamportClock, agentId)`."
          },
          {
            heading: "🟠 THE CLOUDFLARE PORT: How Workers & env.ARTIFACTS Power It",
            detail: "Cloudflare Workers V8 Isolates execute the AST parser at the edge in <2ms with zero cold start, while `env.ARTIFACTS` stores content-addressed merkle trees so agents branch worktrees via zero-copy pointers instead of cloning 500MB repos."
          },
          {
            heading: "🥊 THE COMPETITOR FLAW: Why 'Branch-per-Task' Still Collapses",
            detail: "Other agent prototypes isolate each task into a temporary Git branch or fork. This only delays the collision: when 50 branches merge back into main, diff3 triggers the exact same merge avalanche and rebase doom-loop. Convergence solves this at the root by making the mainline a branchless, commutative AST-CRDT lattice."
          }
        ]
      },
      2: {
        title: "Module 02 Blueprint: RepoBrain Single-Threaded Actor Sequencer",
        runtime: "Cloudflare Durable Objects + Embedded SQLite WAL + WebSocket Hibernation",
        sections: [
          {
            heading: "🔴 THE ISSUE: Distributed Lock Contention in Centralized Git",
            detail: "Traditional Git hosting backed by centralized Postgres/Redis requires expensive Two-Phase Commit (2PC) locks and optimistic concurrency retries when dozens of agents push simultaneously."
          },
          {
            heading: "🟢 THE SOLUTION: Why I Integrated a Causal Lamport Sequencer",
            detail: "Every repository in the portal routes to a single authoritative `RepoBrain` sequencer that assigns strictly increasing Lamport timestamps (`L`) and serializes AST mutations in arrival order without lock contention."
          },
          {
            heading: "🟠 THE CLOUDFLARE PORT: Why Durable Objects Are the Exact Port",
            detail: "By routing `REPO_BRAIN.idFromName(repoId)` to a Cloudflare Durable Object, compute and embedded SQLite WAL storage live inside the exact same single-threaded V8 isolate—delivering ~10ms atomic commits globally."
          }
        ]
      },
      3: {
        title: "Module 03 Blueprint: Edit-Time AST Symbol Leases & HTTP 423 Backpressure",
        runtime: "Durable Object In-Memory Lock Table + Durable Object Alarms API",
        sections: [
          {
            heading: "🔴 THE ISSUE: Wasted LLM Inference Tokens on Colliding Edits",
            detail: "If two agents (`agent_security` and `agent_fraud`) simultaneously refactor the exact same function (`func:processOrder`), detecting the conflict at `git push` time means both agents already spent $1–$5 of LLM inference tokens."
          },
          {
            heading: "🟢 THE SOLUTION: Why I Integrated Pre-Inference Symbol Leases",
            detail: "Before invoking its LLM, an agent calls `POST /api/leases/request` to claim a short TTL lock on the target AST symbol. Competing agents receive `HTTP 423 Locked` + `estimatedWaitMs` semantic backpressure at 0 generated tokens."
          },
          {
            heading: "🟠 THE CLOUDFLARE PORT: How DO Memory & Alarms Power It",
            detail: "The Durable Object holds the active symbol lock table in memory for sub-millisecond lookups and schedules `ctx.storage.setAlarm(expiresAt)` to deterministically evict stale agent locks the millisecond their TTL expires."
          }
        ]
      },
      4: {
        title: "Module 04 Blueprint: Pre-Merge Code Immune System & Antibody Splicer",
        runtime: "Dynamic Cloudflare Worker Isolates + Inline AST Transformation",
        sections: [
          {
            heading: "🔴 THE ISSUE: Compilable AI Code with Semantic Boundary Bugs",
            detail: "LLMs frequently generate code that passes static type checks (`tsc`/ESLint) but omits critical domain invariants—like `transferFunds(amount)` allowing negative numbers (`-99999`). Waiting 5 minutes for external CI is too slow for autonomous swarms."
          },
          {
            heading: "🟢 THE SOLUTION: Why I Integrated an Inline Immune Sentinel",
            detail: "Every `POST /api/commit` passes through a pre-merge fuzzer that probes numeric and security boundaries (`[-99999, 0, NaN]`) and automatically synthesizes + splices a runtime `RangeError` guard ('antibody') into the AST node."
          },
          {
            heading: "🟠 THE CLOUDFLARE PORT: How V8 Worker Isolates Make It Instant",
            detail: "Because Cloudflare Worker Isolates spin up in <4ms without container cold starts, Convergence executes adversarial boundary fuzzing inline during the commit request before writing to Durable Object SQLite."
          }
        ]
      },
      5: {
        title: "Module 05 Blueprint: Reverse Pull Requests & Git Notes Provenance",
        runtime: "Durable Object WebSocket Hibernation + refs/notes/agent-provenance",
        sections: [
          {
            heading: "🔴 THE ISSUE: Human PR Review Fatigue & Lost AI Reasoning",
            detail: "Humans cannot review 5,000 routine agent PRs a day, and standard Git commit messages discard the agent's Chain-of-Thought, model version, and token telemetry."
          },
          {
            heading: "🟢 THE SOLUTION: Why I Integrated Reverse PRs & Git Notes",
            detail: "Agents auto-merge routine symbols and only open a Reverse PR when they hit an architectural fork requiring human judgment. Meanwhile, full CoT metadata is stored in `refs/notes/agent-provenance` without mutating commit SHAs."
          },
          {
            heading: "🟠 THE CLOUDFLARE PORT: How WebSocket Hibernation Powers Steering",
            detail: "Using `state.acceptWebSocket()`, the Durable Object keeps thousands of waiting agent sockets hibernated at zero memory cost, then broadcasts the human architect's 1-click decision across the swarm in <15ms."
          }
        ]
      }
    };


    // =========================================================================
    // INTERACTIVE ENGINEERING GLOSSARY & CLICKABLE DIFFICULT TERMS DIALOGUE
    // =========================================================================
    const ENGINEERING_GLOSSARY = {
      'ast-crdt': {
        label: 'AST-CRDT',
        category: 'MERGE ENGINE // DATA STRUCTURES',
        title: 'AST-CRDT (Abstract Syntax Tree Conflict-Free Replicated Data Type)',
        simple: 'Imagine 25 chefs adding new recipes to a shared cookbook. Standard Git treats the book like a flat Word document of numbered lines—so 25 chefs typing at the bottom of page 10 overwrite each other. An AST-CRDT treats each function as an independent recipe card (like `func:handleRefund_1`) that can be combined in any order with zero collisions.',
        eng: 'An Abstract Syntax Tree (AST) parses source code into typed declaration nodes (`FunctionDeclaration`, `InterfaceDeclaration`). A state-based CRDT (LWW-Element-Set) merges disjoint symbol additions via commutative set union (A ⊕ B = B ⊕ A) and resolves same-symbol edits deterministically via `(lamportClock, agentId)`.',
        cf: 'Cloudflare Workers V8 Isolates parse TypeScript AST nodes at the edge in <2ms, while `env.ARTIFACTS` persists each symbol as a content-addressed merkle node.'
      },
      'diff3': {
        label: 'GNU diff3',
        category: 'LEGACY GIT // BOTTLENECK',
        title: 'GNU diff3 (Traditional 3-Way Line-Based Text Merge)',
        simple: 'The 1988 algorithm inside standard Git that compares files line-by-line like a raw notepad. Because it only understands line numbers and not code structure, 25 agents appending functions at line 78 cause 24 merge conflicts.',
        eng: 'A line-oriented 3-way merge algorithm (`base`, `ours`, `theirs`) using Longest Common Subsequence (LCS) text hunks. Concurrent appends at EOF share an identical `@@ -78,0 +79,4 @@` line anchor with divergent bodies, halting 96% of parallel agents.',
        cf: 'Replaced in Convergence by our AST-CRDT Symbol Reconciler running inside a single-threaded Cloudflare Durable Object.'
      },
      'lcs': {
        label: 'LCS',
        category: 'ALGORITHMS // TEXT DIFFING',
        title: 'LCS (Longest Common Subsequence)',
        simple: 'The line-matching puzzle standard Git solves to figure out which lines of text stayed the same between two edits. It is completely blind to whether a block of text is a TypeScript function or a comment.',
        eng: 'Dynamic programming algorithm O(N·M) used by `diff` to align raw text lines. Because LCS anchors changes to surrounding line numbers, parallel appends at the end of a file collide on the same anchor.',
        cf: 'Convergence bypasses line-level LCS during swarm merges by addressing AST symbol hashes directly in Durable Object SQLite.'
      },
      'lamport': {
        label: 'Lamport Clock',
        category: 'DISTRIBUTED SYSTEMS // CAUSAL ORDERING',
        title: 'Lamport Logical Clock (L: Monotonic Causal Counter)',
        simple: 'Physical wall-clocks on different servers can drift by milliseconds. A Lamport Clock (`L: 1, 2, 3...`) is a single unbreakable ticket counter at a deli counter that gives every agent commit an indisputable causal order.',
        eng: 'A monotonically increasing logical scalar counter invented by Leslie Lamport (`L_next = max(L_local, L_msg) + 1`). Combined with `agentId` tie-breaking, it defines a strict total order across concurrent distributed mutations.',
        cf: 'Incremented atomically on every AST graft inside the single-threaded `RepoBrain` Durable Object.'
      },
      'durable-object': {
        label: 'Durable Object',
        category: 'CLOUDFLARE PRIMITIVE // ACTOR SEQUENCER',
        title: 'Cloudflare Durable Object (Single-Threaded Edge Actor)',
        simple: 'Instead of 50 cloud servers fighting over a shared database with slow locks, a Durable Object is a single, globally unique air-traffic controller for a repository—every agent in the world streams into that one controller, which lines up commits in ~10ms.',
        eng: 'A Cloudflare compute primitive providing global singleton routing (`REPO_BRAIN.idFromName(repoId)`) and single-threaded V8 event-loop execution co-located with private transactional SQLite disk storage.',
        cf: 'Powers `RepoBrain`—serializing concurrent agent waves without distributed Two-Phase Commit (2PC) lock contention.'
      },
      'sqlite-wal': {
        label: 'DO SQLite WAL',
        category: 'STORAGE ENGINE // ZERO-LATENCY ACID',
        title: 'Durable Object Embedded SQLite WAL (Write-Ahead Logging)',
        simple: 'Instead of sending database queries across the internet (which takes 50–150ms), the SQLite database lives inside the exact same server memory as the code and writes changes in under 1 millisecond.',
        eng: 'Embedded SQLite running in Write-Ahead Logging (WAL) mode directly attached to a Cloudflare Durable Object (`ctx.storage.sql`), eliminating network round-trips for ACID transactions.',
        cf: 'Persists the AST symbol table, Lamport clock scalar, active symbol leases, and Git Notes provenance at the edge.'
      },
      'artifacts': {
        label: 'env.ARTIFACTS',
        category: 'CLOUDFLARE PRIMITIVE // MERKLE CAS',
        title: 'Cloudflare Artifacts & Merkle CAS (Content-Addressed Storage)',
        simple: 'Instead of making 100 AI agents download a 500MB repository 100 times, Content-Addressed Storage saves every piece of code by its cryptographic fingerprint (hash). Agents branch instant zero-copy pointers in 1ms.',
        eng: 'A directed acyclic Merkle tree where every source blob and AST subtree is addressed by its SHA-256 digest (`env.ARTIFACTS`), enabling zero-copy branching and O(1) structural equality checks.',
        cf: 'Bound natively in `wrangler.jsonc` (`"artifacts": [{"binding": "ARTIFACTS"}]`) as our edge Git object store.'
      },
      'http-423': {
        label: 'HTTP 423 Backpressure',
        category: 'SWARM COORDINATION // TOKEN SAVINGS',
        title: 'HTTP 423 Locked & Pre-Inference Semantic Backpressure',
        simple: 'If Agent A is already rewriting `processOrder()`, and Agent B tries to edit that exact same function 0.6s later, the server replies `HTTP 423 Locked: Wait 11s` BEFORE Agent B spends money generating LLM tokens.',
        eng: 'Returning the WebDAV `423 Locked` status code with `estimatedWaitMs` and current holder metadata during the pre-generation lease handshake, halting redundant LLM token inference.',
        cf: 'Arbitrated in <1ms by the `RepoBrain` Durable Object lock table, saving ~1,420 LLM tokens per prevented collision.'
      },
      'symbol-lease': {
        label: 'Symbol Lease',
        category: 'CONCURRENCY CONTROL // TTL LOCKS',
        title: 'Edit-Time AST Symbol Lease & Durable Object Alarms',
        simple: 'A temporary 12-second reservation pass on a single function (`func:processOrder`) instead of locking the whole file. If an agent disconnects, an automatic alarm clock unlocks the symbol after 12 seconds.',
        eng: 'Fine-grained, time-bounded (`TTL`) advisory write lock on an individual AST declaration node, backed by `ctx.storage.setAlarm(expiresAt)` for deterministic lock eviction.',
        cf: 'Uses Cloudflare Durable Object Alarms API so expired agent leases are cleaned up with millisecond precision.'
      },
      'worker-isolate': {
        label: 'Worker Isolate',
        category: 'CLOUDFLARE PRIMITIVE // ZERO COLD START',
        title: 'Cloudflare V8 Worker Isolate (Sub-4ms Edge Sandbox)',
        simple: 'Traditional cloud containers (Docker/Lambda) take 1–5 seconds to boot up. A V8 Isolate is the ultra-lightweight engine inside Chrome that boots a secure sandbox in under 4 milliseconds.',
        eng: 'Memory-isolated V8 execution contexts sharing a single host runtime process, achieving 0ms cold starts and microsecond context switching across 300+ Cloudflare edge locations.',
        cf: 'Executes our inline Pre-Merge Code Immune System fuzzing probes during `POST /api/commit`.'
      },
      'ast-antibody': {
        label: 'AST Antibody',
        category: 'AUTONOMOUS SECURITY // SELF-HEALING',
        title: 'Pre-Merge Invariant Fuzzing & AST Antibody Splicing',
        simple: 'Like white blood cells for code: when an agent pushes `transferFunds(amount)`, the repo automatically tests it with `-99999`. When it sees the bug, it automatically writes and splices the `if (amount <= 0) throw RangeError` guard into the code in 4ms.',
        eng: 'Adversarial boundary fuzzing of AST function parameters against domain invariants (`strict_positive_amount`), followed by automated synthetic AST guard node injection before commit persistence.',
        cf: 'Runs inline inside a dynamic Cloudflare Worker Isolate before the Durable Object commits the symbol to SQLite.'
      },
      'reverse-pr': {
        label: 'Reverse PR',
        category: 'HUMAN-AI UX // INVERSION OF CONTROL',
        title: 'Reverse Pull Request (Swarm-to-Human Escalation)',
        simple: 'Normal PR: a human writes code and waits for review. Reverse PR: the AI swarm merges routine code automatically, and only opens a multiple-choice ticket asking the Human Architect when it hits a major design trade-off.',
        eng: 'Inversion of control in version control where autonomous agents self-merge invariant-verified AST symbols and open blocking escalation tickets only on architectural or schema trade-offs.',
        cf: 'Persisted in Durable Object SQLite; 1-click human resolution broadcasts over Hibernatable WebSockets in <15ms.'
      },
      'ws-hibernation': {
        label: 'WebSocket Hibernation',
        category: 'CLOUDFLARE PRIMITIVE // REAL-TIME BUS',
        title: 'Durable Object WebSocket Hibernation (state.acceptWebSocket)',
        simple: 'Keeping 10,000 live agent connections open normally costs a fortune in RAM. WebSocket Hibernation lets the server sleep for $0 while keeping all 10,000 connections alive, waking up in 1ms when a message arrives.',
        eng: 'Cloudflare’s `state.acceptWebSocket(ws)` API, which offloads idle WebSocket connections to the edge proxy tier so the Durable Object consumes zero memory/CPU until a frame arrives.',
        cf: 'Connects all Claude Code CLI sessions and Worker agents to `RepoBrain` for instant Lamport & Reverse PR broadcasts.'
      },
      'git-notes': {
        label: 'Git Notes (CoT)',
        category: 'GIT PROTOCOL // PROVENANCE',
        title: 'Chain-of-Thought Git Notes (refs/notes/agent-provenance)',
        simple: 'A built-in feature of Git that lets you attach a structured sticky note (containing the AI’s reasoning, model name, and token cost) to any commit without changing the commit’s cryptographic SHA hash.',
        eng: 'Native Git object metadata stored under `refs/notes/agent-provenance` mapping commit digests to JSON Chain-of-Thought blobs while preserving 100% wire compatibility with standard `git fetch`.',
        cf: 'Indexed in Durable Object SQLite and `env.ARTIFACTS` for instant inspection in the Convergence Portal or CLI.'
      },
      '2pc': {
        label: '2PC Lock',
        category: 'DISTRIBUTED SYSTEMS // BOTTLENECK',
        title: 'Two-Phase Commit (2PC) & Distributed Lock Contention',
        simple: 'When multiple database servers have to vote over the network before saving a commit. Under a 100-agent swarm wave, every agent gets stuck waiting in line behind network lock handshakes.',
        eng: 'A distributed atomic commitment protocol requiring prepare/commit network round-trips across nodes, causing severe latency spikes under high write concurrency.',
        cf: 'Eliminated in Convergence by co-locating single-threaded compute and SQLite WAL inside one Durable Object.'
      }
    };

    const TERM_REGEX_MAP = [
      { key: 'ast-crdt', rx: /\b(AST-CRDTs?|AST\s+Symbol\s+Graph|CRDTs?)\b/g },
      { key: 'diff3', rx: /\b(GNU\s+diff3|diff3)\b/g },
      { key: 'lcs', rx: /\b(Longest\s+Common\s+Subsequence|LCS)\b/g },
      { key: 'lamport', rx: /\b(Lamport\s+clocks?|Lamport\s+timestamps?|Lamport\s+scalar|Lamport)\b/gi },
      { key: 'durable-object', rx: /\b(Durable\s+Objects?|RepoBrain)\b/g },
      { key: 'sqlite-wal', rx: /\b(SQLite\s+WAL|DO\s+SQLite|DO_SQLITE)\b/g },
      { key: 'artifacts', rx: /\b(env\.ARTIFACTS|Cloudflare\s+Artifacts|Merkle\s+CAS|Merkle\s+trees?|merkle\s+pointers?)\b/g },
      { key: 'http-423', rx: /\b(HTTP\s+423(?:\s+Locked)?|423\s+Backpressure|semantic\s+backpressure)\b/gi },
      { key: 'symbol-lease', rx: /\b(Symbol\s+Leases?|DO\s+Alarms?\s+API|setAlarm)\b/g },
      { key: 'worker-isolate', rx: /\b(V8\s+Isolates?|Worker\s+Isolates?|Worker\s+isolate)\b/g },
      { key: 'ast-antibody', rx: /\b(Immune\s+Sentinel|AST\s+antibody|RangeError\s+antibody)\b/gi },
      { key: 'reverse-pr', rx: /\b(Reverse\s+Pull\s+Requests?|Reverse\s+PRs?|Inversion\s+of\s+Control)\b/g },
      { key: 'ws-hibernation', rx: /\b(Hibernatable\s+WebSockets?|WebSocket\s+Hibernation|acceptWebSocket)\b/g },
      { key: 'git-notes', rx: /\b(refs\/notes\/agent-provenance|Git\s+Notes|Chain-of-Thought)\b/g },
      { key: '2pc', rx: /\b(Two-Phase\s+Commit|\(2PC\)|2PC)\b/g }
    ];

    function linkifyTerms(htmlString) {
      if (!htmlString) return '';
      // Split by HTML tags so we only replace text outside of <...> attributes
      const parts = String(htmlString).split(/(<[^>]+>)/g);
      const seenInBlock = new Set();
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith('<')) continue;
        let text = parts[i];
        TERM_REGEX_MAP.forEach(({ key, rx }) => {
          if (seenInBlock.has(key)) return;
          text = text.replace(rx, (match) => {
            if (seenInBlock.has(key)) return match;
            seenInBlock.add(key);
            return `<button type="button" onclick="openTermModal('${key}')" class="term-chip" title="Inspect definition: ${match}">${match}</button>`;
          });
        });
        parts[i] = text;
      }
      return parts.join('');
    }

    function openTermModal(termKey) {
      const modal = document.getElementById('term-modal');
      if (!modal) return;
      const item = ENGINEERING_GLOSSARY[termKey] || ENGINEERING_GLOSSARY['ast-crdt'];
      document.getElementById('term-modal-category').innerText = item.category;
      document.getElementById('term-modal-title').innerText = item.title;
      document.getElementById('term-modal-simple').innerText = item.simple;
      document.getElementById('term-modal-eng').innerText = item.eng;
      document.getElementById('term-modal-cf').innerText = item.cf;

      const pillsBox = document.getElementById('term-modal-pills');
      if (pillsBox) {
        pillsBox.innerHTML = Object.keys(ENGINEERING_GLOSSARY).map(k => {
          const g = ENGINEERING_GLOSSARY[k];
          const active = k === termKey;
          return `<button type="button" onclick="openTermModal('${k}')" class="px-2.5 py-1 rounded-md font-mono text-[11px] transition border ${active ? 'bg-[#F6821F] text-zinc-950 font-bold border-[#F6821F]' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'}">${escapeHtml(g.label)}</button>`;
        }).join('');
      }
      modal.classList.remove('hidden');
    }

    function closeTermModal() {
      document.getElementById('term-modal')?.classList.add('hidden');
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTermModal();
    });
    window.openTermModal = openTermModal;
    window.closeTermModal = closeTermModal;
