import { describe, it, expect } from 'vitest';
import { CodeCRDT } from '../src/core/crdt.js';
import { parseSourceToSymbols } from '../src/core/ast-engine.js';

describe('CodeCRDT', () => {
  it('should accept and converge concurrent operations from multiple agents', () => {
    const crdt = new CodeCRDT();

    const symA = parseSourceToSymbols('api.ts', 'export function login() { return true; }').symbols.get('func:login')!;
    const symB = parseSourceToSymbols('api.ts', 'export function logout() { return false; }').symbols.get('func:logout')!;

    // Agent A inserts login
    crdt.applyOperation({
      id: 'op1',
      type: 'upsert',
      filename: 'api.ts',
      symbolId: 'func:login',
      symbol: symA,
      agentId: 'agent_a',
      lamport: 1,
      wallClock: 1000,
    });

    // Agent B inserts logout
    crdt.applyOperation({
      id: 'op2',
      type: 'upsert',
      filename: 'api.ts',
      symbolId: 'func:logout',
      symbol: symB,
      agentId: 'agent_b',
      lamport: 2,
      wallClock: 1001,
    });

    const source = crdt.getFileSource('api.ts');
    expect(source).toContain('function login');
    expect(source).toContain('function logout');
  });

  it('should handle symbol deletion with tombstones', () => {
    const crdt = new CodeCRDT();
    const sym = parseSourceToSymbols('api.ts', 'export function temp() {}').symbols.get('func:temp')!;

    crdt.applyOperation({
      id: 'op1',
      type: 'upsert',
      filename: 'api.ts',
      symbolId: 'func:temp',
      symbol: sym,
      agentId: 'agent_a',
      lamport: 1,
      wallClock: 1000,
    });

    expect(crdt.getFileSource('api.ts')).toContain('function temp');

    // Delete op with higher Lamport
    crdt.applyOperation({
      id: 'op2',
      type: 'delete',
      filename: 'api.ts',
      symbolId: 'func:temp',
      agentId: 'agent_b',
      lamport: 2,
      wallClock: 1002,
    });

    expect(crdt.getFileSource('api.ts')).not.toContain('function temp');
  });
});
