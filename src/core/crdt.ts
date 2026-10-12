import { SymbolNode, SymbolKind, symbolsToSource } from './ast-engine.js';

export interface SymbolOperation {
  id: string; // Op UUID
  type: 'upsert' | 'delete';
  filename: string;
  symbolId: string;
  symbol?: SymbolNode;
  agentId: string;
  lamport: number;
  wallClock: number;
}

export interface SymbolRecord {
  symbol: SymbolNode;
  agentId: string;
  lamport: number;
  wallClock: number;
  deleted: boolean;
}

/**
 * State-based / Operation-based CRDT for a code repository.
 * Symbols act as independent registers with Lamport clocks,
 * guaranteeing convergence across hundreds of concurrent agent commits.
 */
export class CodeCRDT {
  // filename -> (symbolId -> SymbolRecord)
  private fileSymbols: Map<string, Map<string, SymbolRecord>> = new Map();
  private maxLamport: number = 0;
  private opLog: SymbolOperation[] = [];

  constructor() {}

  /**
   * Applies an incoming operation from an agent.
   * Returns whether the operation was accepted (won over existing state).
   */
  public applyOperation(op: SymbolOperation): boolean {
    this.maxLamport = Math.max(this.maxLamport, op.lamport) + 1;
    this.opLog.push(op);
    if (this.opLog.length > 500) {
      this.opLog.shift();
    }

    if (!this.fileSymbols.has(op.filename)) {
      this.fileSymbols.set(op.filename, new Map());
    }

    const fileMap = this.fileSymbols.get(op.filename)!;
    const existing = fileMap.get(op.symbolId);

    if (op.type === 'delete') {
      if (!existing || op.lamport > existing.lamport || (op.lamport === existing.lamport && op.agentId > existing.agentId)) {
        fileMap.set(op.symbolId, {
          symbol: existing ? existing.symbol : {
            id: op.symbolId,
            kind: 'statement',
            name: op.symbolId,
            code: '',
            hash: 'deleted',
            dependencies: [],
            order: 999,
          },
          agentId: op.agentId,
          lamport: op.lamport,
          wallClock: op.wallClock,
          deleted: true,
        });
        return true;
      }
      return false;
    }

    if (!op.symbol) return false;

    // Upsert case
    if (!existing) {
      fileMap.set(op.symbolId, {
        symbol: op.symbol,
        agentId: op.agentId,
        lamport: op.lamport,
        wallClock: op.wallClock,
        deleted: false,
      });
      return true;
    }

    // Existing record: deterministic tie-breaker:
    // 1. Higher Lamport clock wins
    // 2. Lexicographically greater Agent ID breaks ties deterministically
    const opWins =
      op.lamport > existing.lamport ||
      (op.lamport === existing.lamport && op.agentId >= existing.agentId);

    if (opWins) {
      fileMap.set(op.symbolId, {
        symbol: op.symbol,
        agentId: op.agentId,
        lamport: op.lamport,
        wallClock: op.wallClock,
        deleted: false,
      });
      return true;
    }

    return false;
  }

  /**
   * Generates the current source code of a file from active symbols.
   */
  public getFileSource(filename: string): string {
    const fileMap = this.fileSymbols.get(filename);
    if (!fileMap) return '';

    const activeSymbols = new Map<string, SymbolNode>();
    for (const [id, record] of fileMap.entries()) {
      if (!record.deleted) {
        activeSymbols.set(id, record.symbol);
      }
    }

    return symbolsToSource(filename, activeSymbols);
  }

  /**
   * Returns all active files and their content.
   */
  public getAllFiles(): Map<string, string> {
    const result = new Map<string, string>();
    for (const filename of this.fileSymbols.keys()) {
      result.set(filename, this.getFileSource(filename));
    }
    return result;
  }

  /**
   * Returns all active symbols across a file.
   */
  public getFileSymbols(filename: string): Map<string, SymbolNode> {
    const fileMap = this.fileSymbols.get(filename);
    const result = new Map<string, SymbolNode>();
    if (!fileMap) return result;

    for (const [id, record] of fileMap.entries()) {
      if (!record.deleted) {
        result.set(id, record.symbol);
      }
    }
    return result;
  }

  public getLamportClock(): number {
    return this.maxLamport;
  }

  public getOperationHistory(): SymbolOperation[] {
    return [...this.opLog];
  }
}
