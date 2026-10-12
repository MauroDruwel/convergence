import { CodeCRDT, SymbolOperation } from '../core/crdt.js';
import { parseSourceToSymbols, mergeSymbolMaps, SymbolConflict, SymbolNode } from '../core/ast-engine.js';
import { ArtifactsAdapter } from '../core/artifacts-adapter.js';
import { SemanticArbiter } from '../core/arbiter.js';

export interface AgentCommitRequest {
  agentId: string;
  branchName?: string;
  filename: string;
  sourceCode: string;
  message: string;
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
  type: 'commit' | 'ast_merge' | 'conflict_detected' | 'arbiter_resolved' | 'reverse_pr' | 'swarm_start';
  agentId: string;
  timestamp: number;
  data: any;
}

/**
 * Durable Object: The single-threaded repository brain.
 * Manages atomic symbol registration, CRDT reconciliation,
 * live WebSocket telemetry, and human reverse PRs.
 */
export class RepoBrain {
  private crdt: CodeCRDT;
  private artifacts: ArtifactsAdapter;
  private arbiter: SemanticArbiter;
  private sockets: Set<any> = new Set();
  private events: SwarmEvent[] = [];
  private reversePRs: Map<string, ReversePullRequest> = new Map();
  private repoName: string = 'convergence-core';

  constructor(state?: any, env?: any) {
    this.crdt = new CodeCRDT();
    this.artifacts = new ArtifactsAdapter(env?.ARTIFACTS);
    this.arbiter = new SemanticArbiter(env?.AI);

    // Seed default starter codebase if empty
    this.seedRepository();
  }

  private seedRepository() {
    const defaultCode = `// Core Commerce API
import { createId } from 'crypto';

export interface PaymentConfig {
  currency: string;
  merchantId: string;
  sandbox: boolean;
}

export const CONFIG: PaymentConfig = {
  currency: 'USD',
  merchantId: 'merch_cf_2026',
  sandbox: true,
};

export function processOrder(orderId: string, amount: number): boolean {
  console.log(\`Processing order \${orderId} for $\${amount}\`);
  return amount > 0;
}
`;
    const parsed = parseSourceToSymbols('index.ts', defaultCode);
    let lamport = 1;
    for (const [id, symbol] of parsed.symbols.entries()) {
      this.crdt.applyOperation({
        id: `seed_${id}`,
        type: 'upsert',
        filename: 'index.ts',
        symbolId: id,
        symbol,
        agentId: 'system_init',
        lamport: lamport++,
        wallClock: Date.now(),
      });
    }

    this.artifacts.commit(
      this.repoName,
      'main',
      'System',
      'Seed repository with commerce module',
      { 'index.ts': defaultCode }
    );
  }

  /**
   * Broadcasts an event to all connected dashboard WebSockets.
   */
  private broadcast(event: SwarmEvent) {
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
   * Primary entry point for an agent pushing a commit to the repository.
   */
  public async handleAgentCommit(req: AgentCommitRequest): Promise<{
    success: boolean;
    cleanMerge: boolean;
    conflicts: any[];
    arbitrated: boolean;
    commitId: string;
    updatedCode: string;
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

    // 3. Apply only changed or added symbols into CRDT (delta-only)
    let currentLamport = this.crdt.getLamportClock() + 1;
    const changedSymbolIds = new Set<string>([
      ...mergeResult.cleanMerges,
      ...mergeResult.conflicts.map((c) => c.symbolId),
    ]);

    for (const symId of changedSymbolIds) {
      const symNode = resolvedSymbols.get(symId);
      if (symNode) {
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
      }
    }

    const finalSource = this.crdt.getFileSource(req.filename);

    // 4. Record commit in Cloudflare Artifacts
    const artifactCommit = await this.artifacts.commit(
      this.repoName,
      req.branchName || 'main',
      `Agent ${req.agentId}`,
      req.message,
      { [req.filename]: finalSource }
    );

    // 5. Broadcast success event
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
    };
  }

  /**
   * Human Invariant Steering: An agent raises a reverse PR question.
   */
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

  /**
   * Retrieves full snapshot of repository state for dashboard/clients.
   */
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
      events: this.events.slice(0, 50),
      reversePRs: Array.from(this.reversePRs.values()),
      lamportClock: this.crdt.getLamportClock(),
    };
  }

  /**
   * WebSocket client registration.
   */
  public registerSocket(ws: any) {
    this.sockets.add(ws);
    ws.send(JSON.stringify({ type: 'init_state', state: this.getState() }));
  }

  public unregisterSocket(ws: any) {
    this.sockets.delete(ws);
  }
}
