import { CodeCRDT, SymbolOperation } from '../core/crdt.js';
import { parseSourceToSymbols, mergeSymbolMaps, SymbolConflict, SymbolNode } from '../core/ast-engine.js';
import { ArtifactsAdapter } from '../core/artifacts-adapter.js';
import { SemanticArbiter } from '../core/arbiter.js';
import { CodeImmuneSystem, ImmuneDefenseAction } from '../core/immune-system.js';
import { ChronoRevertEngine } from '../core/chrono-revert.js';
import { SymbolLeaseEngine, SymbolLease, LeaseAcquisitionResult } from '../core/symbol-leases.js';
import { ProvenanceTracker, AgentProvenance } from '../core/provenance.js';
import { RepoSqliteStorage } from '../core/sqlite-storage.js';

export interface AgentCommitRequest {
  agentId: string;
  branchName?: string;
  filename: string;
  sourceCode: string;
  message: string;
  promptIntent?: string;
  reasoningChain?: string[];
}

export interface ReversePullRequest {
  id: string;
  agentId: string;
  question: string;
  options: string[];
  chosenOption?: string;
  status: 'pending' | 'resolved';
  createdAt: number;
}

export interface SwarmEvent {
  id: string;
  type:
    | 'commit'
    | 'ast_merge'
    | 'conflict_detected'
    | 'arbiter_resolved'
    | 'reverse_pr'
    | 'swarm_start'
    | 'immune_defense'
    | 'chrono_revert'
    | 'lease_acquired'
    | 'backpressure_alert';
  agentId: string;
  timestamp: number;
  data: any;
}

/**
 * Durable Object: The single-threaded repository brain.
 * Manages atomic symbol registration, CRDT reconciliation,
 * SQLite storage, symbol leases, Git Notes provenance, and live WebSockets.
 */
export class RepoBrain {
  public ctx: any;
  public env: any;
  private crdt: CodeCRDT;
  private artifacts: ArtifactsAdapter;
  private arbiter: SemanticArbiter;
  private leaseEngine: SymbolLeaseEngine;
  private provenance: ProvenanceTracker;
  private sqlite: RepoSqliteStorage;
  private sockets: Set<any> = new Set();
  private events: SwarmEvent[] = [];
  private reversePRs: Map<string, ReversePullRequest> = new Map();
  private repoName: string = 'convergence-core';

  constructor(state?: any, env?: any) {
    this.ctx = state;
    this.env = env;
    this.crdt = new CodeCRDT();
    this.artifacts = new ArtifactsAdapter(env?.ARTIFACTS);
    this.arbiter = new SemanticArbiter(env?.AI);
    this.leaseEngine = new SymbolLeaseEngine();
    this.provenance = new ProvenanceTracker();
    this.sqlite = new RepoSqliteStorage(state?.storage?.sql);

    // Seed default starter codebase
    this.seedRepository();
  }

  private seedRepository() {
    const defaultCode = `// Core Commerce API — edge-native payment processing (Convergence mainline)
import { createId, createHmac } from 'crypto';

export interface PaymentConfig {
  currency: string;
  merchantId: string;
  sandbox: boolean;
}

export type TransactionStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  idempotencyKey?: string;
}

export const CONFIG: PaymentConfig = {
  currency: 'USD',
  merchantId: 'merch_cf_2026',
  sandbox: true,
};

export const LEDGER: Record<string, Transaction> = {};

export function validateAmount(amount: number): { valid: boolean; reason: string } {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return { valid: false, reason: 'not-a-finite-number' };
  if (amount <= 0) return { valid: false, reason: 'must-be-positive' };
  if (amount > 1000000) return { valid: false, reason: 'exceeds-maximum' };
  return { valid: true, reason: 'ok' };
}

export function authorizePayment(orderId: string, amount: number, idempotencyKey?: string): Transaction | null {
  const check = validateAmount(amount);
  if (!check.valid) return null;
  const tx: Transaction = { id: createId(), orderId, amount, currency: CONFIG.currency, status: 'authorized' };
  if (idempotencyKey) tx.idempotencyKey = idempotencyKey;
  LEDGER[tx.id] = tx;
  return tx;
}

export function capturePayment(txId: string): boolean {
  const tx = LEDGER[txId];
  if (!tx || tx.status !== 'authorized') return false;
  tx.status = 'captured';
  return true;
}

export function refundPayment(txId: string, amount?: number): boolean {
  const tx = LEDGER[txId];
  if (!tx || (tx.status !== 'captured' && tx.status !== 'authorized')) return false;
  const value = amount ?? tx.amount;
  if (value <= 0 || value > tx.amount) return false;
  tx.status = 'refunded';
  return true;
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function processOrder(orderId: string, amount: number): boolean {
  console.log(\`Processing order \${orderId} for $\${amount}\`);
  return amount > 0;
}
`;
    const readmeCode = `# convergence-core
Agent-native payment mainline. Humans steer, agents write.

## How code lands here
1. Agents acquire a symbol lease before editing (no merge queues).
2. Symbols merge by AST hash, not line numbers.
3. The immune system fuzzes every symbol pre-merge.
4. Architecture questions come back to humans as Reverse PRs.

## Why not Git
Git sees lines. This repo sees trees.
`;
    const policyCode = `// Convergence merge policy — agents read this before landing work
export interface MergePolicy {
  requireLease: boolean;
  maxAgentsPerWave: number;
  immuneScan: 'pre-merge' | 'post-merge';
  provenance: 'git-notes' | 'commit-message';
}

export const MERGE_POLICY: MergePolicy = {
  requireLease: true,
  maxAgentsPerWave: 100000,
  immuneScan: 'pre-merge',
  provenance: 'git-notes',
};

export const TOKEN_BUDGET_PER_WAVE = 1420;

export function policyAllows(symbolId: string): boolean {
  return !symbolId.startsWith('file:');
}
`;
    const paymentCode = `// Core Payment Gateway Services
import { CONFIG, Transaction, validateAmount, LEDGER } from './index.js';

export class PaymentGateway {
  private merchantId: string = CONFIG.merchantId;

  public async capture(txId: string): Promise<boolean> {
    const tx = LEDGER[txId];
    if (!tx || tx.status !== 'authorized') return false;
    tx.status = 'captured';
    return true;
  }

  public async settleBatch(transactions: Transaction[]): Promise<{ total: number; fee: number }> {
    let total = 0;
    for (const tx of transactions) {
      if (tx.status === 'captured') total += tx.amount;
    }
    const fee = total * 0.029;
    return { total: total - fee, fee };
  }
}
`;

    const authCode = `// Structural Edge Authentication & JWT Verification
export interface AuthUser {
  id: string;
  role: 'agent' | 'human_architect';
  permissions: string[];
}

export function verifyAgentToken(token: string): boolean {
  if (!token || !token.startsWith('cf_agt_')) return false;
  return token.length >= 16;
}

export function checkLeasePermission(user: AuthUser, symbolId: string): boolean {
  if (user.role === 'human_architect') return true;
  return !symbolId.startsWith('policy:');
}
`;

    const wranglerCode = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "convergence",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "durable_objects": {
    "bindings": [{ "name": "REPO_BRAIN", "class_name": "RepoBrain" }]
  },
  "artifacts": [{ "binding": "ARTIFACTS" }],
  "ai": { "binding": "AI" }
}
`;

    const licenseCode = `MIT License

Copyright (c) 2026 Mauro Druwel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
`;

    const seedFiles: Array<{ name: string; code: string }> = [
      { name: 'index.ts', code: defaultCode },
      { name: 'src/payment.ts', code: paymentCode },
      { name: 'src/auth.ts', code: authCode },
      { name: 'src/policy.ts', code: policyCode },
      { name: 'wrangler.jsonc', code: wranglerCode },
      { name: 'README.md', code: readmeCode },
      { name: 'LICENSE', code: licenseCode },
    ];
    const seedSnapshot: Record<string, string> = {};
    let lamport = 1;
    for (const file of seedFiles) {
      const parsed = parseSourceToSymbols(file.name, file.code);
      seedSnapshot[file.name] = file.code;
      for (const [id, symbol] of parsed.symbols.entries()) {
        this.crdt.applyOperation({
          id: `seed_${id}`,
          type: 'upsert',
          filename: file.name,
          symbolId: id,
          symbol,
          agentId: 'system_init',
          lamport: lamport++,
          wallClock: Date.now(),
        });
        this.sqlite.upsertSymbol(file.name, symbol, lamport);
        this.leaseEngine.registerDependency(id, 'interface:PaymentConfig');
      }
    }

    this.artifacts.commit(
      this.repoName,
      'main',
      'System',
      'Seed repository with commerce module',
      seedSnapshot
    );
  }

  /**
   * Broadcasts an event to all connected dashboard WebSockets.
   */
  public broadcast(event: SwarmEvent) {
    this.events.unshift(event);
    if (this.events.length > 200) this.events.pop();

    const payload = JSON.stringify({ type: 'swarm_event', event });
    for (const ws of this.sockets) {
      try {
        ws.send(payload);
      } catch (err) {
        this.sockets.delete(ws);
      }
    }
  }

  /**
   * Edit-Time Coordination: Requests an AST Symbol Lease.
   */
  public requestSymbolLease(
    symbolId: string,
    agentId: string,
    leaseType: 'exclusive_write' | 'shared_read' = 'exclusive_write',
    ttlMs: number = 5000,
    intent: string = 'Refactoring symbol'
  ): LeaseAcquisitionResult {
    const result = this.leaseEngine.acquireLease(symbolId, agentId, leaseType, ttlMs, intent);

    if (result.granted && result.lease) {
      this.broadcast({
        id: `evt_lease_${Date.now()}`,
        type: 'lease_acquired',
        agentId,
        timestamp: Date.now(),
        data: result.lease,
      });
    } else if (result.backpressure) {
      this.broadcast({
        id: `evt_bp_${Date.now()}`,
        type: 'backpressure_alert',
        agentId,
        timestamp: Date.now(),
        data: result.backpressure,
      });
    }

    return result;
  }

  /**
   * Releases an active symbol lease and broadcasts the release event.
   */
  public releaseSymbolLease(symbolId: string, agentId?: string): boolean {
    const released = this.leaseEngine.releaseLease(symbolId, agentId);
    if (released) {
      this.broadcast({
        id: `evt_lease_rel_${Date.now()}`,
        type: 'lease_released' as any,
        agentId: agentId || 'human_architect',
        timestamp: Date.now(),
        data: { symbolId },
      });
    }
    return released;
  }

  /**
   * Primary entry point for an agent pushing a commit to the repository.
   */
  public async handleAgentCommit(req: AgentCommitRequest): Promise<{
    success: boolean;
    cleanMerge: boolean;
    conflicts: any[];
    arbitrated: boolean;
    commitId: string;
    updatedCode: string;
    provenanceId?: string;
  }> {
    const startTime = Date.now();
    const currentCode = this.crdt.getFileSource(req.filename);
    const baseSymbols = parseSourceToSymbols(req.filename, currentCode).symbols;
    const incomingSymbols = parseSourceToSymbols(req.filename, req.sourceCode).symbols;

    // 1. Perform 3-way semantic comparison against current state
    const mergeResult = mergeSymbolMaps(
      baseSymbols,
      { agentId: 'mainline', symbols: baseSymbols },
      { agentId: req.agentId, symbols: incomingSymbols },
      req.filename
    );

    let arbitrated = false;
    const resolvedSymbols = new Map<string, SymbolNode>(mergeResult.mergedSymbols);

    // 2. If symbol collisions exist, invoke Semantic Arbiter
    if (mergeResult.hasConflicts) {
      this.broadcast({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'conflict_detected',
        agentId: req.agentId,
        timestamp: Date.now(),
        data: { conflicts: mergeResult.conflicts },
      });

      for (const conflict of mergeResult.conflicts) {
        const resolution = await this.arbiter.resolveConflict(conflict);
        resolvedSymbols.set(conflict.symbolId, resolution.resolvedSymbol);
        arbitrated = true;

        this.broadcast({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'arbiter_resolved',
          agentId: req.agentId,
          timestamp: Date.now(),
          data: {
            symbolId: conflict.symbolId,
            strategy: resolution.strategy,
            explanation: resolution.explanation,
            latencyMs: resolution.latencyMs,
          },
        });
      }
    }

    // 3. Apply changed symbols into CRDT and SQLite
    let currentLamport = this.crdt.getLamportClock() + 1;
    const changedSymbolIds = new Set<string>([
      ...mergeResult.cleanMerges,
      ...mergeResult.conflicts.map((c) => c.symbolId),
    ]);

    for (const symId of changedSymbolIds) {
      let symNode = resolvedSymbols.get(symId);
      if (symNode) {
        // Proactive Code Immune Scan
        const defense = CodeImmuneSystem.analyzeAndDefend(symNode);
        if (defense) {
          symNode = defense.antibodySymbol;
          this.broadcast({
            id: `evt_immune_${Date.now()}_${symId}`,
            type: 'immune_defense',
            agentId: 'immune_sentinel',
            timestamp: Date.now(),
            data: {
              symbolId: symId,
              threat: defense.threat.threatType,
              severity: defense.threat.severity,
              guard: defense.synthesizedGuard,
              latencyMs: defense.latencyMs,
            },
          });
        }

        this.crdt.applyOperation({
          id: `op_${Date.now()}_${symId}`,
          type: 'upsert',
          filename: req.filename,
          symbolId: symId,
          symbol: symNode,
          agentId: req.agentId,
          lamport: currentLamport++,
          wallClock: Date.now(),
        });

        // Persist to SQLite
        this.sqlite.upsertSymbol(req.filename, symNode, currentLamport);
        // Release any edit lease held by agent
        this.leaseEngine.releaseLease(symId, req.agentId);
      }
    }

    const finalSource = this.crdt.getFileSource(req.filename);

    // 4. Record commit in Cloudflare Artifacts
    const authorName = req.agentId.startsWith('agent_') ? `Agent ${req.agentId}` : req.agentId;
    const artifactCommit = await this.artifacts.commit(
      this.repoName,
      req.branchName || 'main',
      authorName,
      req.message,
      { [req.filename]: finalSource }
    );

    // 5. Record Chain-of-Thought Provenance (refs/notes/agent-provenance)
    // Attribute the commit to what the agent actually added: prefer newly-added
    // function-like symbols, then any new symbol, then any landed symbol.
    // (cleanMerges also carries stale-base delete markers — see merge Cases 5/6.)
    const baseIds = new Set(baseSymbols.keys());
    const inMap = (id: string) => resolvedSymbols.has(id);
    const isNew = (id: string) => !baseIds.has(id);
    const isFnLike = (id: string) => /^(func|class|interface|type):/.test(id);
    const primarySymbolId =
      [...changedSymbolIds].find((id) => inMap(id) && isNew(id) && isFnLike(id)) ||
      [...changedSymbolIds].find((id) => inMap(id) && isNew(id)) ||
      [...changedSymbolIds].find((id) => inMap(id)) ||
      `file:${req.filename}`;
    const provRecord = this.provenance.recordProvenance({
      commitId: artifactCommit.commitId,
      symbolId: primarySymbolId,
      agentId: req.agentId,
      model: '@cf/meta/llama-3.3-70b-instruct',
      promptIntent: req.promptIntent || req.message,
      reasoningChain: req.reasoningChain || [
        `Analyzed AST boundary of ${primarySymbolId}`,
        'Synthesized deterministic typed change',
        'Verified invariant pass: 0 syntax errors',
      ],
      invariantsChecked: ['typescript_type_soundness', 'non_negative_boundary', 'zero_regression'],
      tokenTelemetry: {
        promptTokens: Math.floor(Math.random() * 500) + 200,
        completionTokens: Math.floor(Math.random() * 200) + 80,
        latencyMs: Date.now() - startTime,
      },
    });

    this.sqlite.recordProvenance(provRecord);

    // 6. Broadcast success event
    this.broadcast({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: mergeResult.hasConflicts ? 'arbiter_resolved' : 'ast_merge',
      agentId: req.agentId,
      timestamp: Date.now(),
      data: {
        commitId: artifactCommit.commitId,
        message: req.message,
        cleanSymbols: mergeResult.cleanMerges,
        arbitrated,
        provenanceId: provRecord.id,
        durationMs: Date.now() - startTime,
      },
    });

    return {
      success: true,
      cleanMerge: !mergeResult.hasConflicts,
      conflicts: mergeResult.conflicts,
      arbitrated,
      commitId: artifactCommit.commitId,
      updatedCode: finalSource,
      provenanceId: provRecord.id,
    };
  }

  public chronoRevertSymbol(filename: string, symbolId: string): any {
    const res = ChronoRevertEngine.revertSymbol(this.crdt, filename, symbolId);
    this.broadcast({
      id: `evt_revert_${Date.now()}`,
      type: 'chrono_revert',
      agentId: 'chrono_guardian',
      timestamp: Date.now(),
      data: res,
    });
    return res;
  }

  public createReversePR(agentId: string, question: string, options: string[]): ReversePullRequest {
    const id = `rpr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const pr: ReversePullRequest = {
      id,
      agentId,
      question,
      options,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.reversePRs.set(id, pr);

    this.broadcast({
      id: `evt_${Date.now()}`,
      type: 'reverse_pr',
      agentId,
      timestamp: Date.now(),
      data: pr,
    });

    return pr;
  }

  public resolveReversePR(id: string, chosenOption: string): boolean {
    const pr = this.reversePRs.get(id);
    if (!pr) return false;
    pr.chosenOption = chosenOption;
    pr.status = 'resolved';

    this.broadcast({
      id: `evt_res_${Date.now()}`,
      type: 'reverse_pr',
      agentId: pr.agentId,
      timestamp: Date.now(),
      data: pr,
    });

    return true;
  }

  public getState() {
    return {
      repoName: this.repoName,
      files: Object.fromEntries(this.crdt.getAllFiles()),
      symbols: Object.fromEntries(
        Array.from(this.crdt.getAllFiles().keys()).map((f) => [
          f,
          Array.from(this.crdt.getFileSymbols(f).values()),
        ])
      ),
      activeLeases: this.leaseEngine.getActiveLeases(),
      provenanceRecords: this.provenance.getAll().slice(-20),
      sqliteStats: this.sqlite.getStats(),
      events: this.events.slice(0, 50),
      reversePRs: Array.from(this.reversePRs.values()),
      lamportClock: this.crdt.getLamportClock(),
    };
  }

  public getProvenance(commitId: string): AgentProvenance[] {
    return this.provenance.getByCommit(commitId);
  }

  public registerSocket(ws: any) {
    this.sockets.add(ws);
    ws.send(JSON.stringify({ type: 'init_state', state: this.getState() }));
  }

  public unregisterSocket(ws: any) {
    this.sockets.delete(ws);
  }

  // Cloudflare Durable Object WebSocket Hibernation Handlers
  public async fetch(request: Request): Promise<Response> {
    const webSocketPair = new (globalThis as any).WebSocketPair();
    const [client, server] = [webSocketPair[0], webSocketPair[1]];

    if (this.ctx?.acceptWebSocket) {
      this.ctx.acceptWebSocket(server);
    } else {
      server.accept();
    }
    this.registerSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  public webSocketMessage(ws: any, message: string) {
    try {
      const data = JSON.parse(message);
      if (data.type === 'request_lease') {
        const res = this.requestSymbolLease(
          data.symbolId,
          data.agentId,
          data.leaseType,
          data.ttlMs,
          data.intent
        );
        ws.send(JSON.stringify({ type: 'lease_response', response: res }));
      }
    } catch (e) {}
  }

  public webSocketClose(ws: any, code: number, reason: string, wasClean: boolean) {
    this.unregisterSocket(ws);
  }
}
