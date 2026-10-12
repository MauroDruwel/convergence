import { SymbolNode } from './ast-engine.js';
import { AgentProvenance } from './provenance.js';

export interface SqlStorageDriver {
  exec(query: string, ...params: any[]): { toArray?(): any[]; [Symbol.iterator]?(): Iterator<any> } | any;
}

/**
 * Durable Object SQLite Repository Storage:
 * Manages atomic relational tables for symbols, dependency graphs, leases,
 * operations logs, and agent provenance.
 * Compatible with Cloudflare DO `state.storage.sql` and local in-memory fallback.
 */
export class RepoSqliteStorage {
  private driver?: SqlStorageDriver;
  // In-memory fallback tables for local Node.js execution
  private memoryTables: {
    symbols: Map<string, any>;
    dependencies: Set<string>; // "from:to"
    leases: Map<string, any>;
    operations: Map<string, any>;
    provenance: Map<string, any>;
  };

  constructor(driver?: SqlStorageDriver) {
    this.driver = driver;
    this.memoryTables = {
      symbols: new Map(),
      dependencies: new Set(),
      leases: new Map(),
      operations: new Map(),
      provenance: new Map(),
    };
    this.initSchema();
  }

  private initSchema() {
    if (this.driver) {
      try {
        this.driver.exec(`
          CREATE TABLE IF NOT EXISTS symbols (
            id TEXT PRIMARY KEY,
            filename TEXT,
            kind TEXT,
            name TEXT,
            code TEXT,
            hash TEXT,
            lamport INTEGER,
            updated_at INTEGER
          );
          CREATE TABLE IF NOT EXISTS symbol_dependencies (
            from_id TEXT,
            to_id TEXT,
            PRIMARY KEY(from_id, to_id)
          );
          CREATE TABLE IF NOT EXISTS symbol_leases (
            symbol_id TEXT PRIMARY KEY,
            agent_id TEXT,
            lease_type TEXT,
            expires_at INTEGER,
            intent TEXT
          );
          CREATE TABLE IF NOT EXISTS operations_log (
            id TEXT PRIMARY KEY,
            filename TEXT,
            symbol_id TEXT,
            op_type TEXT,
            agent_id TEXT,
            lamport INTEGER,
            wall_clock INTEGER
          );
          CREATE TABLE IF NOT EXISTS agent_provenance (
            id TEXT PRIMARY KEY,
            commit_id TEXT,
            symbol_id TEXT,
            agent_id TEXT,
            model TEXT,
            intent TEXT,
            created_at INTEGER
          );
        `);
      } catch (err) {
        console.warn('SQLite schema initialization notice:', err);
      }
    }
  }

  public upsertSymbol(filename: string, sym: SymbolNode, lamport: number) {
    if (this.driver) {
      try {
        this.driver.exec(
          `INSERT OR REPLACE INTO symbols (id, filename, kind, name, code, hash, lamport, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          sym.id,
          filename,
          sym.kind,
          sym.name,
          sym.code,
          sym.hash,
          lamport,
          Date.now()
        );
        return;
      } catch (e) {}
    }

    this.memoryTables.symbols.set(sym.id, {
      id: sym.id,
      filename,
      kind: sym.kind,
      name: sym.name,
      code: sym.code,
      hash: sym.hash,
      lamport,
      updated_at: Date.now(),
    });
  }

  public getSymbol(id: string): SymbolNode | null {
    if (this.driver) {
      try {
        const cursor = this.driver.exec(`SELECT * FROM symbols WHERE id = ?`, id);
        const rows = cursor?.toArray ? cursor.toArray() : Array.from(cursor || []);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            kind: r.kind,
            name: r.name,
            code: r.code,
            hash: r.hash,
            dependencies: [],
            order: 0,
          };
        }
      } catch (e) {}
    }

    const row = this.memoryTables.symbols.get(id);
    if (!row) return null;
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      code: row.code,
      hash: row.hash,
      dependencies: [],
      order: 0,
    };
  }

  public getAllSymbols(filename?: string): SymbolNode[] {
    if (this.driver) {
      try {
        const query = filename
          ? `SELECT * FROM symbols WHERE filename = ?`
          : `SELECT * FROM symbols`;
        const cursor = filename ? this.driver.exec(query, filename) : this.driver.exec(query);
        const rows = cursor?.toArray ? cursor.toArray() : Array.from(cursor || []);
        return rows.map((r: any) => ({
          id: r.id,
          kind: r.kind,
          name: r.name,
          code: r.code,
          hash: r.hash,
          dependencies: [],
          order: 0,
        }));
      } catch (e) {}
    }

    const res: SymbolNode[] = [];
    for (const row of this.memoryTables.symbols.values()) {
      if (!filename || row.filename === filename) {
        res.push({
          id: row.id,
          kind: row.kind,
          name: row.name,
          code: row.code,
          hash: row.hash,
          dependencies: [],
          order: 0,
        });
      }
    }
    return res;
  }

  public recordProvenance(prov: AgentProvenance) {
    if (this.driver) {
      try {
        this.driver.exec(
          `INSERT OR REPLACE INTO agent_provenance (id, commit_id, symbol_id, agent_id, model, intent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          prov.id,
          prov.commitId,
          prov.symbolId,
          prov.agentId,
          prov.model,
          prov.promptIntent,
          prov.timestamp
        );
        return;
      } catch (e) {}
    }

    this.memoryTables.provenance.set(prov.id, prov);
  }

  public getStats() {
    return {
      storageEngine: this.driver ? 'Cloudflare Durable Object SQLite (ctx.storage.sql)' : 'Embedded Relational Driver',
      totalSymbolsCount: this.memoryTables.symbols.size,
      activeLeasesCount: this.memoryTables.leases.size,
      provenanceRecordsCount: this.memoryTables.provenance.size,
    };
  }
}
