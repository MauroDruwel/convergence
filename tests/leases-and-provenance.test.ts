import { describe, it, expect } from 'vitest';
import { SymbolLeaseEngine } from '../src/core/symbol-leases.js';
import { ProvenanceTracker } from '../src/core/provenance.js';
import { RepoSqliteStorage } from '../src/core/sqlite-storage.js';

describe('Edit-Time Coordination: Symbol Leases & Git Notes Provenance', () => {
  it('should grant independent leases concurrently to different agents on orthogonal symbols', () => {
    const engine = new SymbolLeaseEngine();

    const resA = engine.acquireLease('func:calculateTax', 'agent_finance', 'exclusive_write', 2000, 'Add tax rate');
    const resB = engine.acquireLease('func:processOrder', 'agent_order', 'exclusive_write', 2000, 'Add logging');

    expect(resA.granted).toBe(true);
    expect(resB.granted).toBe(true);
    expect(engine.getActiveLeases().length).toBe(2);
  });

  it('should trigger Semantic Backpressure when an agent attempts to mutate a locked symbol', () => {
    const engine = new SymbolLeaseEngine();
    engine.registerDependency('func:processOrder', 'interface:PaymentConfig');

    // Agent A locks the interface
    engine.acquireLease('interface:PaymentConfig', 'agent_architect', 'exclusive_write', 3000, 'Refactor schema');

    // Agent B attempts to mutate the same interface
    const resB = engine.acquireLease('interface:PaymentConfig', 'agent_worker', 'exclusive_write', 3000, 'Add fields');

    expect(resB.granted).toBe(false);
    expect(resB.backpressure).toBeDefined();
    expect(resB.backpressure?.leaseHolderAgentId).toBe('agent_architect');
    expect(resB.backpressure?.dependentSymbols).toContain('func:processOrder');
  });

  it('should record Chain-of-Thought Provenance and format Git Notes JSON payload', () => {
    const tracker = new ProvenanceTracker();

    const prov = tracker.recordProvenance({
      commitId: 'c_test_123',
      symbolId: 'func:refundUser',
      agentId: 'agent_payment',
      model: '@cf/meta/llama-3.3-70b-instruct',
      promptIntent: 'Add idempotency key check',
      reasoningChain: [
        'Checked header idempotency-key',
        'Added lookup in KV cache',
        'Verified test passing',
      ],
      invariantsChecked: ['no_double_spend', 'zero_regression'],
      tokenTelemetry: { promptTokens: 420, completionTokens: 110, latencyMs: 45 },
    });

    expect(prov.id).toBeDefined();
    expect(tracker.getByCommit('c_test_123').length).toBe(1);
    expect(tracker.getBySymbol('func:refundUser').length).toBe(1);

    const gitNotesJson = tracker.toGitNotesPayload(prov);
    const parsed = JSON.parse(gitNotesJson);
    expect(parsed.schema).toBe('cloudflare.artifacts.provenance.v1');
    expect(parsed.agent).toBe('agent_payment');
    expect(parsed.intent).toBe('Add idempotency key check');
  });

  it('should store and query symbols in relational SQLite storage', () => {
    const storage = new RepoSqliteStorage();

    storage.upsertSymbol(
      'main.ts',
      {
        id: 'func:hello',
        kind: 'function',
        name: 'hello',
        code: 'export function hello() { return "world"; }',
        hash: 'h123',
        dependencies: [],
        order: 1,
      },
      1
    );

    const retrieved = storage.getSymbol('func:hello');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('hello');

    const stats = storage.getStats();
    expect(stats.totalSymbolsCount).toBe(1);
  });

  it('should roundtrip symbol records and provenance for post-eviction rehydration', () => {
    const storage = new RepoSqliteStorage();

    storage.upsertSymbol(
      'index.ts',
      {
        id: 'func:rehydrated',
        kind: 'function',
        name: 'rehydrated',
        code: 'export function rehydrated(): boolean { return true; }',
        hash: 'h999',
        dependencies: [],
        order: 7,
      },
      42,
      'agent_persist'
    );

    const tracker = new ProvenanceTracker();
    const prov = tracker.recordProvenance({
      commitId: 'c_persist_1',
      symbolId: 'func:rehydrated',
      agentId: 'agent_persist',
      model: '@cf/meta/llama-3.3-70b-instruct',
      promptIntent: 'Persist across eviction',
      reasoningChain: ['r1'],
      invariantsChecked: ['i1'],
      tokenTelemetry: { promptTokens: 10, completionTokens: 5, latencyMs: 2 },
    });
    storage.recordProvenance(prov);

    // Simulate a fresh instance reading the same backing store.
    const records = storage.getAllSymbolRecords();
    expect(records.length).toBe(1);
    expect(records[0].filename).toBe('index.ts');
    expect(records[0].symbol.order).toBe(7);
    expect(records[0].lamport).toBe(42);
    expect(records[0].agentId).toBe('agent_persist');

    const restored = new ProvenanceTracker();
    restored.restoreRecords(storage.getAllProvenance());
    expect(restored.getByCommit('c_persist_1').length).toBe(1);
    expect(restored.getBySymbol('func:rehydrated').length).toBe(1);
    expect(restored.getAll()[0].reasoningChain).toEqual(['r1']);
  });
});
