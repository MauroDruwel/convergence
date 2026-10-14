export interface TokenTelemetry {
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export interface AgentProvenance {
  id: string; // Prov ID
  commitId: string;
  symbolId: string;
  agentId: string;
  model: string;
  promptIntent: string;
  reasoningChain: string[];
  invariantsChecked: string[];
  tokenTelemetry: TokenTelemetry;
  gitNotesRef: string; // e.g. "refs/notes/agent-provenance"
  timestamp: number;
}

/**
 * Agent Provenance & Chain-of-Thought Version Control:
 * Preserves the reasoning, model attribution, and prompt context of every agent edit
 * directly inside Git metadata (refs/notes/agent-provenance).
 * Resolves Cloudflare's core question: "How do you preserve the reasoning behind an agent's change alongside the raw code diff?"
 */
export class ProvenanceTracker {
  // commitId -> AgentProvenance[]
  private commitIndex: Map<string, AgentProvenance[]> = new Map();
  // symbolId -> AgentProvenance[]
  private symbolIndex: Map<string, AgentProvenance[]> = new Map();
  private records: AgentProvenance[] = [];

  public recordProvenance(entry: Omit<AgentProvenance, 'id' | 'gitNotesRef' | 'timestamp'>): AgentProvenance {
    const record: AgentProvenance = {
      ...entry,
      id: `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      gitNotesRef: 'refs/notes/agent-provenance',
      timestamp: Date.now(),
    };

    this.records.push(record);

    if (!this.commitIndex.has(record.commitId)) {
      this.commitIndex.set(record.commitId, []);
    }
    this.commitIndex.get(record.commitId)!.push(record);

    if (!this.symbolIndex.has(record.symbolId)) {
      this.symbolIndex.set(record.symbolId, []);
    }
    this.symbolIndex.get(record.symbolId)!.push(record);

    return record;
  }

  public getByCommit(commitId: string): AgentProvenance[] {
    return this.commitIndex.get(commitId) || [];
  }

  public getBySymbol(symbolId: string): AgentProvenance[] {
    return this.symbolIndex.get(symbolId) || [];
  }

  public getAll(): AgentProvenance[] {
    return [...this.records];
  }

  /**
   * Restores previously persisted records (post-DO-eviction rehydration)
   * WITHOUT regenerating ids or timestamps — history stays intact.
   */
  public restoreRecords(records: AgentProvenance[]): void {
    for (const record of records) {
      if (!record || !record.id) continue;
      if (this.records.some((r) => r.id === record.id)) continue;
      this.records.push(record);
      if (!this.commitIndex.has(record.commitId)) {
        this.commitIndex.set(record.commitId, []);
      }
      this.commitIndex.get(record.commitId)!.push(record);
      if (!this.symbolIndex.has(record.symbolId)) {
        this.symbolIndex.set(record.symbolId, []);
      }
      this.symbolIndex.get(record.symbolId)!.push(record);
    }
  }

  /**
   * Serializes provenance into a standard Git Notes message payload.
   */
  public toGitNotesPayload(prov: AgentProvenance): string {
    return JSON.stringify(
      {
        schema: 'cloudflare.artifacts.provenance.v1',
        agent: prov.agentId,
        model: prov.model,
        intent: prov.promptIntent,
        reasoning: prov.reasoningChain,
        invariants: prov.invariantsChecked,
        telemetry: prov.tokenTelemetry,
        recorded_at: new Date(prov.timestamp).toISOString(),
      },
      null,
      2
    );
  }
}
