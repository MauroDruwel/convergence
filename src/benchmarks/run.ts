import { HeadToHeadBenchmark } from './comparator.js';

async function main() {
  console.log('===============================================================');
  console.log('   CONVERGENCE vs. TRADITIONAL GIT / GITHUB BENCHMARK HARNESS   ');
  console.log('   Testing Massively Concurrent Agent Swarm (25 Agents)        ');
  console.log('===============================================================\n');

  const bench = new HeadToHeadBenchmark();
  const results = await bench.runConvergenceBenchmark(25);

  console.log('📊 CONCURRENT RESULTS BREAKDOWN:\n');
  console.log(`[Traditional Git]`);
  console.log(`  - Total Concurrent Commits : ${results.totalAgentCommits}`);
  console.log(`  - Merge Conflicts (Failed) : ${results.gitConflicts} (${results.totalAgentCommits - results.gitConflicts} merged)`);
  console.log(`  - Success Rate             : ${results.gitSuccessRate}%`);
  console.log(`  - Blocked / Stalled Agents : ${results.gitBlockedAgents}`);
  console.log(`  - Avg Merge Latency        : ${results.gitAvgMergeLatencyMs}ms\n`);

  console.log(`[Convergence (Cloudflare Workers + Artifacts + AST-CRDT)]`);
  console.log(`  - Total Concurrent Commits : ${results.totalAgentCommits}`);
  console.log(`  - Clean AST Merges         : ${results.convergenceCleanMerges}`);
  console.log(`  - Arbitrated Merges        : ${results.convergenceArbitratedMerges}`);
  console.log(`  - Merge Conflicts (Failed) : ${results.convergenceConflicts}`);
  console.log(`  - Success Rate             : ${results.convergenceSuccessRate}%`);
  console.log(`  - Blocked / Stalled Agents : ${results.convergenceBlockedAgents}`);
  console.log(`  - Avg Merge Latency        : ${results.convergenceAvgMergeLatencyMs}ms\n`);

  console.log('🏆 VERDICT & ADVANTAGE:');
  console.log(`  - Conflict Elimination     : ${results.conflictReduction}`);
  console.log(`  - Concurrency Speedup      : ${results.concurrencyThroughputGain}`);
  console.log('===============================================================\n');
}

main().catch(console.error);
