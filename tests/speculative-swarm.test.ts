import { describe, it, expect } from 'vitest';
import { ArtifactsAdapter } from '../src/core/artifacts-adapter.js';
import { SpeculativeSwarmEngine, SpeculativeBranchSpec } from '../src/core/speculative-swarm.js';

describe('SpeculativeSwarmEngine', () => {
  it('should run parallel speculative branches, evaluate fitness, and promote the winning implementation', async () => {
    const artifacts = new ArtifactsAdapter();
    const swarm = new SpeculativeSwarmEngine(artifacts);

    await artifacts.getOrCreateRepo('ecommerce-repo');
    await artifacts.commit('ecommerce-repo', 'main', 'Init', 'Base code', {
      'calc.ts': 'export function discount(price: number) { return price; }',
    });

    const variants: SpeculativeBranchSpec[] = [
      {
        strategyName: 'naive_percentage',
        agentId: 'agent_1',
        codeVariant: { 'calc.ts': 'export function discount(price: number) { return price * 0.9; }' },
      },
      {
        strategyName: 'vip_tier_matrix',
        agentId: 'agent_2',
        codeVariant: {
          'calc.ts': `
export interface TierRule { tier: string; rate: number; }
export function discount(price: number, tier: string = 'gold') {
  return tier === 'gold' ? price * 0.8 : price * 0.95;
}
`,
        },
      },
      {
        strategyName: 'failing_syntax_variant',
        agentId: 'agent_3',
        codeVariant: { 'calc.ts': 'broken syntax here !@#' },
      },
    ];

    const result = await swarm.runSpeculativeCompetition(
      'ecommerce-repo',
      'Implement multi-tier customer discount engine',
      variants,
      async (files) => {
        const code = files['calc.ts'] || '';
        if (code.includes('broken syntax')) {
          return { passed: false, coverage: 0, latency: 999 };
        }
        if (code.includes('TierRule')) {
          return { passed: true, coverage: 0.95, latency: 12 };
        }
        return { passed: true, coverage: 0.7, latency: 25 };
      }
    );

    expect(result.winningBranch.strategyName).toBe('vip_tier_matrix');
    expect(result.winningBranch.testsPassed).toBe(true);
    expect(result.evaluations.length).toBe(3);
    expect(result.prunedBranches.length).toBe(2);

    // Verify mainline now has the winning branch committed
    const mainFiles = await artifacts.getSparseWorktree('ecommerce-repo', 'main');
    expect(mainFiles['calc.ts']).toContain('TierRule');
  });
});
