export type LeaseType = 'exclusive_write' | 'shared_read';

export interface SymbolLease {
  symbolId: string;
  agentId: string;
  leaseType: LeaseType;
  expiresAt: number;
  acquiredAt: number;
  intent: string;
}

export interface BackpressureAlert {
  symbolId: string;
  blockedAgentId: string;
  leaseHolderAgentId: string;
  reason: string;
  estimatedWaitMs: number;
  dependentSymbols: string[];
}

export interface LeaseAcquisitionResult {
  granted: boolean;
  lease?: SymbolLease;
  backpressure?: BackpressureAlert;
}

/**
 * Symbol Lease Engine:
 * Implements edit-time AST-level coordination with real-time semantic backpressure.
 * Instead of streaming raw text edits, agents acquire short-lived TTL leases on specific AST symbols.
 * If an agent mutates an interface, downstream dependent symbols receive instant backpressure signals.
 */
export class SymbolLeaseEngine {
  private leases: Map<string, SymbolLease> = new Map();
  // symbolId -> Set of symbolIds that depend on it
  private dependencyGraph: Map<string, Set<string>> = new Map();

  /**
   * Registers a dependency relation: 'fromSymbolId' calls or implements 'toSymbolId'
   */
  public registerDependency(fromSymbolId: string, toSymbolId: string) {
    if (!this.dependencyGraph.has(toSymbolId)) {
      this.dependencyGraph.set(toSymbolId, new Set());
    }
    this.dependencyGraph.get(toSymbolId)!.add(fromSymbolId);
  }

  public getDependents(symbolId: string): string[] {
    const deps = this.dependencyGraph.get(symbolId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Requests a lease on an AST symbol.
   * If an active conflicting lease exists, emits semantic backpressure.
   */
  public acquireLease(
    symbolId: string,
    agentId: string,
    leaseType: LeaseType = 'exclusive_write',
    ttlMs: number = 5000,
    intent: string = 'Refactor symbol'
  ): LeaseAcquisitionResult {
    const now = Date.now();
    const existing = this.leases.get(symbolId);

    // Clean up expired lease if present
    if (existing && existing.expiresAt <= now) {
      this.leases.delete(symbolId);
    }

    const activeLease = this.leases.get(symbolId);

    if (activeLease) {
      // If same agent already holds it, renew
      if (activeLease.agentId === agentId) {
        activeLease.expiresAt = now + ttlMs;
        return { granted: true, lease: activeLease };
      }

      // If conflicting lease held by another agent: trigger Semantic Backpressure
      if (leaseType === 'exclusive_write' || activeLease.leaseType === 'exclusive_write') {
        const remainingMs = Math.max(1, activeLease.expiresAt - now);
        const dependents = this.getDependents(symbolId);

        return {
          granted: false,
          backpressure: {
            symbolId,
            blockedAgentId: agentId,
            leaseHolderAgentId: activeLease.agentId,
            reason: `Symbol is currently locked for mutation by ${activeLease.agentId} ("${activeLease.intent}")`,
            estimatedWaitMs: remainingMs,
            dependentSymbols: dependents,
          },
        };
      }
    }

    // Grant new lease
    const newLease: SymbolLease = {
      symbolId,
      agentId,
      leaseType,
      expiresAt: now + ttlMs,
      acquiredAt: now,
      intent,
    };

    this.leases.set(symbolId, newLease);
    return { granted: true, lease: newLease };
  }

  /**
   * Releases an active lease when the agent commits or aborts.
   */
  public releaseLease(symbolId: string, agentId?: string): boolean {
    const existing = this.leases.get(symbolId);
    if (existing && (!agentId || existing.agentId === agentId || agentId === 'human_architect')) {
      this.leases.delete(symbolId);
      return true;
    }
    return false;
  }

  public getActiveLeases(): SymbolLease[] {
    this.purgeExpired();
    return Array.from(this.leases.values());
  }

  /**
   * Evicts all expired leases. Called lazily on access AND deterministically
   * from the Durable Object `alarm()` handler (see RepoBrain), which is
   * scheduled via `ctx.storage.setAlarm(expiresAt)` on every acquisition.
   * Returns the evicted symbol ids for broadcast/telemetry.
   */
  public purgeExpired(): string[] {
    const now = Date.now();
    const evicted: string[] = [];
    for (const [id, lease] of this.leases.entries()) {
      if (lease.expiresAt <= now) {
        this.leases.delete(id);
        evicted.push(id);
      }
    }
    return evicted;
  }
}
