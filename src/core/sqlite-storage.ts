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
            ord INTEGER DEFAULT 0,
            agent_id TEXT DEFAULT '',
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
            payload TEXT DEFAULT '',
            created_at INTEGER
          );
        `);
        // Evolve pre-existing tables from older deployments (no-ops if present).
        for (const ddl of [
          'ALTER TABLE symbols ADD COLUMN ord INTEGER DEFAULT 0',
          "ALTER TABLE symbols ADD COLUMN agent_id TEXT DEFAULT ''",
          "ALTER TABLE agent_provenance ADD COLUMN payload TEXT DEFAULT ''",
        ]) {
          try {
            this.driver.exec(ddl);
          } catch {
            /* column already exists */
          }
        }
      } catch (err) {
        console.warn('SQLite schema initialization notice:', err);
      }
    }
  }

  public upsertSymbol(filename: string, sym: SymbolNode, lamport: number, agentId: string = '') {
    if (this.driver) {
      try {
        this.driver.exec(
          `INSERT OR REPLACE INTO symbols (id, filename, kind, name, code, hash, lamport, ord, agent_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          sym.id,
          filename,
          sym.kind,
          sym.name,
          sym.code,
          sym.hash,
          lamport,
          sym.order || 0,
          agentId,
          Date.now()
        );
        return;
      } catch (e) {}
    }

    this.memoryTables.symbols.set(`${filename}::${sym.id}`, {
      id: sym.id,
      filename,
      kind: sym.kind,
      name: sym.name,
      code: sym.code,
      hash: sym.hash,
      lamport,
      ord: sym.order || 0,
      agent_id: agentId,
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

    const row = (() => {
      const direct = this.memoryTables.symbols.get(id);
      if (direct) return direct;
      // Composite keys are `filename::id`; fall back to suffix scan.
      for (const [key, value] of this.memoryTables.symbols.entries()) {
        if (key === id || key.endsWith(`::${id}`)) return value;
      }
      return undefined;
    })();
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
          `INSERT OR REPLACE INTO agent_provenance (id, commit_id, symbol_id, agent_id, model, intent, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          prov.id,
          prov.commitId,
          prov.symbolId,
          prov.agentId,
          prov.model,
          prov.promptIntent,
          JSON.stringify(prov),
          prov.timestamp
        );
        return;
      } catch (e) {}
    }

    this.memoryTables.provenance.set(prov.id, prov);
  }

  /**
   * Full symbol records for post-eviction CRDT rehydration.
   * Returns every persisted (filename, symbol, lamport, agentId) tuple.
   */
  public getAllSymbolRecords(): Array<{
    filename: string;
    symbol: SymbolNode;
    lamport: number;
    agentId: string;
  }> {
    if (this.driver) {
      try {
        const cursor: any = this.driver.exec(
          `SELECT id, filename, kind, name, code, hash, lamport, ord, agent_id FROM symbols`
        );
        const rows = cursor?.toArray ? cursor.toArray() : Array.from(cursor || []);
        return rows.map((r: any) => ({
          filename: r.filename,
          symbol: {
            id: r.id,
            kind: r.kind,
            name: r.name,
            code: r.code,
            hash: r.hash,
            dependencies: [],
            order: Number(r.ord ?? 0),
          } as SymbolNode,
          lamport: Number(r.lamport ?? 0),
          agentId: r.agent_id || '',
        }));
      } catch (e) {}
    }

    return Array.from(this.memoryTables.symbols.values()).map((row: any) => ({
      filename: row.filename,
      symbol: {
        id: row.id,
        kind: row.kind,
        name: row.name,
        code: row.code,
        hash: row.hash,
        dependencies: [],
        order: Number(row.ord ?? 0),
      } as SymbolNode,
      lamport: Number(row.lamport ?? 0),
      agentId: row.agent_id || '',
    }));
  }

  /** Full provenance records for post-eviction rehydration (newest last). */
  public getAllProvenance(): AgentProvenance[] {
    if (this.driver) {
      try {
        const cursor: any = this.driver.exec(
          `SELECT id, commit_id, symbol_id, agent_id, model, intent, payload, created_at FROM agent_provenance ORDER BY created_at ASC`
        );
        const rows = cursor?.toArray ? cursor.toArray() : Array.from(cursor || []);
        const out: AgentProvenance[] = [];
        for (const r of rows) {
          if (r.payload) {
            try {
              out.push(JSON.parse(r.payload));
              continue;
            } catch {
              /* fall through to legacy columns */
            }
          }
          if (r.id || r.commit_id) {
            out.push({
              id: r.id,
              commitId: r.commit_id,
              symbolId: r.symbol_id,
              agentId: r.agent_id,
              model: r.model,
              promptIntent: r.intent,
              reasoningChain: [],
              invariantsChecked: [],
              tokenTelemetry: { promptTokens: 0, completionTokens: 0, latencyMs: 0 },
              gitNotesRef: 'refs/notes/agent-provenance',
              timestamp: Number(r.created_at ?? Date.now()),
            });
          }
        }
        return out;
      } catch (e) {}
    }

    return Array.from(this.memoryTables.provenance.values());
  }

  public getStats() {
    if (this.driver) {
      // Query the REAL Durable Object SQLite tables (never memory counters).
      try {
        const count = (table: string): number => {
          const cursor: any = this.driver!.exec(`SELECT COUNT(*) AS n FROM ${table}`);
          const rows = cursor?.toArray ? cursor.toArray() : Array.from(cursor || []);
          return Number(rows?.[0]?.n ?? 0);
        };
        return {
          storageEngine: 'Cloudflare Durable Object SQLite (ctx.storage.sql)',
          totalSymbolsCount: count('symbols'),
          activeLeasesCount: count('symbol_leases'),
          provenanceRecordsCount: count('agent_provenance'),
        };
      } catch {
        /* table missing pre-init: report zeros, not memory state */
        return {
          storageEngine: 'Cloudflare Durable Object SQLite (ctx.storage.sql)',
          totalSymbolsCount: 0,
          activeLeasesCount: 0,
          provenanceRecordsCount: 0,
        };
      }
    }
    return {
      storageEngine: 'Embedded Relational Driver',
      totalSymbolsCount: this.memoryTables.symbols.size,
      activeLeasesCount: this.memoryTables.leases.size,
      provenanceRecordsCount: this.memoryTables.provenance.size,
    };
  }
}
