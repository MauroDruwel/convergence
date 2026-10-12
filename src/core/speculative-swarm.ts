import { ArtifactsAdapter } from './artifacts-adapter.js';
import { parseSourceToSymbols } from './ast-engine.js';

export interface SpeculativeBranchSpec {
  strategyName: string;
  agentId: string;
  codeVariant: Record<string, string>;
}

export interface BranchEvaluation {
  branchName: string;
  strategyName: string;
  agentId: string;
  testsPassed: boolean;
  score: number; // 0 to 100
  metrics: {
    complexityScore: number;
    testCoverage: number;
    latencyMs: number;
  };
}

export interface SwarmExecutionResult {
  objective: string;
  winningBranch: BranchEvaluation;
  evaluations: BranchEvaluation[];
  prunedBranches: string[];
  totalExecutionTimeMs: number;
}

/**
 * Speculative Swarm Branch Breeder:
 * Orchestrates massively parallel exploratory branches, evaluates fitness,
 * and promotes the winning branch to mainline while pruning losers.
 */
export class SpeculativeSwarmEngine {
  private artifacts: ArtifactsAdapter;

  constructor(artifacts: ArtifactsAdapter) {
    this.artifacts = artifacts;
  }

  public async runSpeculativeCompetition(
    repoName: string,
    objective: string,
    variants: SpeculativeBranchSpec[],
    testHarness: (files: Record<string, string>) => Promise<{ passed: boolean; coverage: number; latency: number }>
  ): Promise<SwarmExecutionResult> {
    const startTime = Date.now();
    const evaluations: BranchEvaluation[] = [];
    const createdBranches: string[] = [];

    // 1. Concurrently spawn all speculative branches in Artifacts
    await Promise.all(
      variants.map(async (v, index) => {
        const branchName = `speculative/agent_${v.agentId}_${index}`;
        createdBranches.push(branchName);

        await this.artifacts.createEphemeralBranch(repoName, branchName, 'main');
        await this.artifacts.commit(
          repoName,
          branchName,
          `Agent ${v.agentId}`,
          `Speculative approach: ${v.strategyName}`,
          v.codeVariant
        );

        // 2. Evaluate fitness
        const testRes = await testHarness(v.codeVariant);

        // Calculate AST complexity
        let totalSymbols = 0;
        for (const [filename, code] of Object.entries(v.codeVariant)) {
          const parsed = parseSourceToSymbols(filename, code);
          totalSymbols += parsed.symbols.size;
        }

        // Scoring algorithm:
        // Tests passed (50pts) + Coverage (30pts) + Performance (20pts) - Complexity penalty
        const score = testRes.passed
          ? Math.max(0, 50 + testRes.coverage * 30 + Math.max(0, 20 - testRes.latency / 10) - totalSymbols * 0.5)
          : 10;

        evaluations.push({
          branchName,
          strategyName: v.strategyName,
          agentId: v.agentId,
          testsPassed: testRes.passed,
          score: Math.round(score * 10) / 10,
          metrics: {
            complexityScore: totalSymbols,
            testCoverage: testRes.coverage,
            latencyMs: testRes.latency,
          },
        });
      })
    );

    // Sort evaluations to find winner
    evaluations.sort((a, b) => b.score - a.score);
    const winner = evaluations[0];

    // 3. Promote winner to main
    const winnerWorktree = await this.artifacts.getSparseWorktree(repoName, winner.branchName);
    await this.artifacts.commit(
      repoName,
      'main',
      `Swarm Consensus (${winner.strategyName})`,
      `Promoted winning speculative branch: ${winner.strategyName} for objective: ${objective}`,
      winnerWorktree
    );

    // 4. Prune losing branches
    const prunedBranches: string[] = [];
    for (const ev of evaluations) {
      if (ev.branchName !== winner.branchName) {
        await this.artifacts.deleteBranch(repoName, ev.branchName);
        prunedBranches.push(ev.branchName);
      }
    }

    return {
      objective,
      winningBranch: winner,
      evaluations,
      prunedBranches,
      totalExecutionTimeMs: Date.now() - startTime,
    };
  }
}
