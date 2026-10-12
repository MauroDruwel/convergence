import { describe, it, expect } from 'vitest';
import { parseSourceToSymbols, symbolsToSource, mergeSymbolMaps } from '../src/core/ast-engine.js';

describe('AST Engine', () => {
  it('should parse functions, interfaces, imports, and variables into symbols', () => {
    const code = `
import { uuid } from 'crypto';

export interface User {
  id: string;
  name: string;
}

export const DEFAULT_ROLE = 'user';

export function getUser(id: string): User {
  return { id, name: 'Alex' };
}
`;
    const result = parseSourceToSymbols('test.ts', code);
    expect(result.rawAstAvailable).toBe(true);
    expect(result.symbols.has('import:crypto')).toBe(true);
    expect(result.symbols.has('interface:User')).toBe(true);
    expect(result.symbols.has('var:DEFAULT_ROLE')).toBe(true);
    expect(result.symbols.has('func:getUser')).toBe(true);
  });

  it('should cleanly merge two non-overlapping concurrent agent modifications to the same file (Zero Conflicts)', () => {
    const baseCode = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const baseSymbols = parseSourceToSymbols('math.ts', baseCode).symbols;

    // Agent A adds multiply
    const codeA = `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
`;
    const symbolsA = parseSourceToSymbols('math.ts', codeA).symbols;

    // Agent B adds subtract
    const codeB = `
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
`;
    const symbolsB = parseSourceToSymbols('math.ts', codeB).symbols;

    const mergeResult = mergeSymbolMaps(
      baseSymbols,
      { agentId: 'agent_a', symbols: symbolsA },
      { agentId: 'agent_b', symbols: symbolsB },
      'math.ts'
    );

    expect(mergeResult.hasConflicts).toBe(false);
    expect(mergeResult.conflicts.length).toBe(0);
    expect(mergeResult.mergedSymbols.has('func:add')).toBe(true);
    expect(mergeResult.mergedSymbols.has('func:multiply')).toBe(true);
    expect(mergeResult.mergedSymbols.has('func:subtract')).toBe(true);

    const mergedCode = mergeResult.mergedCode;
    expect(mergedCode).toContain('function add');
    expect(mergedCode).toContain('function multiply');
    expect(mergedCode).toContain('function subtract');
  });

  it('should detect when two agents concurrently edit the SAME symbol with divergent logic', () => {
    const baseCode = `
export function compute(x: number): number {
  return x * 2;
}
`;
    const baseSymbols = parseSourceToSymbols('calc.ts', baseCode).symbols;

    const codeA = `
export function compute(x: number): number {
  return x * 10;
}
`;
    const symbolsA = parseSourceToSymbols('calc.ts', codeA).symbols;

    const codeB = `
export function compute(x: number): number {
  return x * 100;
}
`;
    const symbolsB = parseSourceToSymbols('calc.ts', codeB).symbols;

    const mergeResult = mergeSymbolMaps(
      baseSymbols,
      { agentId: 'agent_alpha', symbols: symbolsA },
      { agentId: 'agent_beta', symbols: symbolsB },
      'calc.ts'
    );

    expect(mergeResult.hasConflicts).toBe(true);
    expect(mergeResult.conflicts.length).toBe(1);
    expect(mergeResult.conflicts[0].symbolId).toBe('func:compute');
  });
});
