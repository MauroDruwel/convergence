import { describe, it, expect } from 'vitest';
import { RepoBrain } from '../src/durable-objects/RepoBrain.js';

describe('RepoBrain Durable Object Actor', () => {
  it('should handle concurrent commits from multiple agents without state corruption', async () => {
    const brain = new RepoBrain();

    const commit1 = brain.handleAgentCommit({
      agentId: 'agent_alpha',
      filename: 'index.ts',
      sourceCode: `
export function healthCheck(): string {
  return "ok";
}
`,
      message: 'Add health check',
    });

    const commit2 = brain.handleAgentCommit({
      agentId: 'agent_beta',
      filename: 'index.ts',
      sourceCode: `
export function metrics(): Record<string, number> {
  return { cpu: 0.1 };
}
`,
      message: 'Add metrics endpoint',
    });

    const [res1, res2] = await Promise.all([commit1, commit2]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    const state = brain.getState();
    const finalCode = state.files['index.ts'];

    expect(finalCode).toContain('function healthCheck');
    expect(finalCode).toContain('function metrics');
    expect(state.events.length).toBeGreaterThan(0);
  });

  it('should handle Reverse PR workflow for human architectural decisions', () => {
    const brain = new RepoBrain();

    const pr = brain.createReversePR(
      'agent_architect',
      'Should we enforce strict null checks or loose types?',
      ['Strict Null Checks', 'Loose Types']
    );

    expect(pr.status).toBe('pending');

    const resolved = brain.resolveReversePR(pr.id, 'Strict Null Checks');
    expect(resolved).toBe(true);

    const state = brain.getState();
    const prInState = state.reversePRs.find((p) => p.id === pr.id);
    expect(prInState?.status).toBe('resolved');
    expect(prInState?.chosenOption).toBe('Strict Null Checks');
  });
});
