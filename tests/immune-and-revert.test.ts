import { describe, it, expect } from 'vitest';
import { parseSourceToSymbols } from '../src/core/ast-engine.js';
import { CodeImmuneSystem } from '../src/core/immune-system.js';
import { ChronoRevertEngine } from '../src/core/chrono-revert.js';
import { CodeCRDT } from '../src/core/crdt.js';

describe('Sublime Innovations: Immune System & Chrono-Revert', () => {
  it('should proactively intercept adversarial boundary bugs and synthesize antibody guards', () => {
    const rawCode = `
export function processPayment(amount: number): boolean {
  console.log("Charging: " + amount);
  return true;
}
`;
    const parsed = parseSourceToSymbols('finance.ts', rawCode);
    const sym = parsed.symbols.get('func:processPayment')!;

    const defense = CodeImmuneSystem.analyzeAndDefend(sym);
    expect(defense).not.toBeNull();
    expect(defense?.neutralized).toBe(true);
    expect(defense?.threat.threatType).toBe('unhandled_boundary');
    expect(defense?.antibodySymbol.code).toContain('Immune Guard: Sanitized input boundary');
    expect(defense?.antibodySymbol.code).toContain('amount <= 0');
  });

  it('should neutralize dynamic code evaluation threats (eval/innerHTML)', () => {
    const dangerousCode = `
export function renderWidget(html: string): void {
  eval("console.log('dangerous')");
}
`;
    const parsed = parseSourceToSymbols('widget.ts', dangerousCode);
    const sym = parsed.symbols.get('func:renderWidget')!;

    const defense = CodeImmuneSystem.analyzeAndDefend(sym);
    expect(defense).not.toBeNull();
    expect(defense?.threat.threatType).toBe('injection_vulnerability');
    expect(defense?.antibodySymbol.code).toContain('blocked by immune guard');
  });

  it('should surgically time-travel revert a single targeted symbol without touching other agents work', () => {
    const crdt = new CodeCRDT();
    const symA = parseSourceToSymbols('index.ts', 'export function featureA() { return "A"; }').symbols.get('func:featureA')!;
    const symB = parseSourceToSymbols('index.ts', 'export function featureB() { return "B"; }').symbols.get('func:featureB')!;

    // Agent A commits featureA
    crdt.applyOperation({
      id: 'opA',
      type: 'upsert',
      filename: 'index.ts',
      symbolId: 'func:featureA',
      symbol: symA,
      agentId: 'agent_a',
      lamport: 1,
      wallClock: 1000,
    });

    // Agent B commits featureB
    crdt.applyOperation({
      id: 'opB',
      type: 'upsert',
      filename: 'index.ts',
      symbolId: 'func:featureB',
      symbol: symB,
      agentId: 'agent_b',
      lamport: 2,
      wallClock: 1001,
    });

    expect(crdt.getFileSource('index.ts')).toContain('featureA');
    expect(crdt.getFileSource('index.ts')).toContain('featureB');

    // Surgically revert ONLY featureA
    const revertRes = ChronoRevertEngine.revertSymbol(crdt, 'index.ts', 'func:featureA');
    expect(revertRes.isolatedRollback).toBe(true);
    expect(revertRes.unaffectedSymbolsCount).toBe(1);

    const afterRevert = crdt.getFileSource('index.ts');
    // featureA is gone!
    expect(afterRevert).not.toContain('featureA');
    // featureB is 100% untouched and preserved!
    expect(afterRevert).toContain('featureB');
  });
});
