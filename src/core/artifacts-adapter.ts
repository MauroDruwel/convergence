export interface ArtifactCommit {
  commitId: string;
  parentCommitId?: string;
  author: string;
  message: string;
  timestamp: number;
  files: Record<string, string>; // filename -> content
}

export interface ArtifactBranch {
  name: string;
  headCommitId: string;
  updatedAt: number;
}

export interface ArtifactRepository {
  name: string;
  defaultBranch: string;
  branches: Map<string, ArtifactBranch>;
  commits: Map<string, ArtifactCommit>;
}

export interface CloudflareArtifactsBinding {
  create?(repoName: string): Promise<any>;
  get?(repoName: string): Promise<any>;
  delete?(repoName: string): Promise<boolean>;
}

/**
 * Adapter for Cloudflare Artifacts (Git-native versioned storage).
 * Supports both Cloudflare's runtime `env.ARTIFACTS` binding and an in-memory
 * high-performance driver for testing, benchmarking, and simulation.
 */
export class ArtifactsAdapter {
  private binding?: CloudflareArtifactsBinding;
  private memoryRepos: Map<string, ArtifactRepository> = new Map();

  constructor(binding?: CloudflareArtifactsBinding) {
    this.binding = binding;
  }

  /**
   * Initializes or retrieves an Artifacts repository.
   */
  public async getOrCreateRepo(repoName: string): Promise<ArtifactRepository> {
    if (this.binding?.get) {
      try {
        const repo = await this.binding.get(repoName);
        if (repo) return repo;
        if (this.binding.create) {
          return await this.binding.create(repoName);
        }
      } catch (err) {
        console.warn('Artifacts binding fallback to local memory driver:', err);
      }
    }

    if (!this.memoryRepos.has(repoName)) {
      const initialCommit: ArtifactCommit = {
        commitId: 'c_init_000000',
        author: 'Convergence System',
        message: 'Initial commit: repository seeded',
        timestamp: Date.now(),
        files: {},
      };

      const branches = new Map<string, ArtifactBranch>();
      branches.set('main', {
        name: 'main',
        headCommitId: initialCommit.commitId,
        updatedAt: Date.now(),
      });

      const commits = new Map<string, ArtifactCommit>();
      commits.set(initialCommit.commitId, initialCommit);

      this.memoryRepos.set(repoName, {
        name: repoName,
        defaultBranch: 'main',
        branches,
        commits,
      });
    }

    return this.memoryRepos.get(repoName)!;
  }

  /**
   * Spawns an ephemeral micro-branch in Artifacts for an agent.
   */
  public async createEphemeralBranch(
    repoName: string,
    branchName: string,
    fromBranch: string = 'main'
  ): Promise<ArtifactBranch> {
    const repo = await this.getOrCreateRepo(repoName);
    const parent = repo.branches.get(fromBranch);
    if (!parent) {
      throw new Error(`Base branch ${fromBranch} does not exist in repo ${repoName}`);
    }

    const newBranch: ArtifactBranch = {
      name: branchName,
      headCommitId: parent.headCommitId,
      updatedAt: Date.now(),
    };

    repo.branches.set(branchName, newBranch);
    return newBranch;
  }

  /**
   * Commits code changes to a branch in Artifacts.
   */
  public async commit(
    repoName: string,
    branchName: string,
    author: string,
    message: string,
    files: Record<string, string>
  ): Promise<ArtifactCommit> {
    const repo = await this.getOrCreateRepo(repoName);
    let branch = repo.branches.get(branchName);

    if (!branch) {
      branch = await this.createEphemeralBranch(repoName, branchName);
    }

    const parentCommit = repo.commits.get(branch.headCommitId);
    const mergedFiles = {
      ...(parentCommit ? parentCommit.files : {}),
      ...files,
    };

    const commitId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const commit: ArtifactCommit = {
      commitId,
      parentCommitId: branch.headCommitId,
      author,
      message,
      timestamp: Date.now(),
      files: mergedFiles,
    };

    repo.commits.set(commitId, commit);
    branch.headCommitId = commitId;
    branch.updatedAt = Date.now();

    return commit;
  }

  /**
   * Slices a sparse micro-worktree containing only requested files for an agent.
   */
  public async getSparseWorktree(
    repoName: string,
    branchName: string,
    filterFiles?: string[]
  ): Promise<Record<string, string>> {
    const repo = await this.getOrCreateRepo(repoName);
    const branch = repo.branches.get(branchName);
    if (!branch) return {};

    const commit = repo.commits.get(branch.headCommitId);
    if (!commit) return {};

    if (!filterFiles || filterFiles.length === 0) {
      return { ...commit.files };
    }

    const sparse: Record<string, string> = {};
    for (const f of filterFiles) {
      if (commit.files[f] !== undefined) {
        sparse[f] = commit.files[f];
      }
    }
    return sparse;
  }

  /**
   * Prunes an ephemeral branch (e.g. losing speculative branches).
   */
  public async deleteBranch(repoName: string, branchName: string): Promise<boolean> {
    const repo = await this.getOrCreateRepo(repoName);
    return repo.branches.delete(branchName);
  }
}
