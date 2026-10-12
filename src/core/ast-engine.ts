import * as parser from '@babel/parser';
import generatePackage from '@babel/generator';
import * as t from '@babel/types';
import { createHash } from 'node:crypto';

// Handle Babel generator ESM/CJS interop
const generate = (generatePackage as any).default || generatePackage;

export type SymbolKind =
  | 'import'
  | 'function'
  | 'interface'
  | 'type'
  | 'class'
  | 'variable'
  | 'statement';

export interface SymbolNode {
  id: string; // e.g. "func:calculateTax", "import:react", "type:UserConfig"
  kind: SymbolKind;
  name: string;
  code: string;
  hash: string;
  dependencies: string[];
  order: number;
}

export interface AstParseResult {
  filename: string;
  symbols: Map<string, SymbolNode>;
  rawAstAvailable: boolean;
}

export interface SymbolConflict {
  symbolId: string;
  name: string;
  kind: SymbolKind;
  baseCode?: string;
  versionA: { agentId: string; code: string; hash: string };
  versionB: { agentId: string; code: string; hash: string };
  reason: string;
}

export interface AstMergeResult {
  mergedSymbols: Map<string, SymbolNode>;
  mergedCode: string;
  cleanMerges: string[]; // Symbol IDs that merged with zero conflict
  conflicts: SymbolConflict[];
  hasConflicts: boolean;
}

function computeHash(content: string): string {
  return createHash('sha256').update(content.trim()).digest('hex').slice(0, 12);
}

/**
 * Extracts referenced identifiers from an AST node to establish symbol dependencies.
 */
function extractDependencies(node: t.Node): string[] {
  const deps = new Set<string>();
  const visited = new WeakSet();
  function walk(n: any) {
    if (!n || typeof n !== 'object' || visited.has(n)) return;
    visited.add(n);
    if (n.type === 'Identifier' && typeof n.name === 'string') {
      deps.add(n.name);
    }
    for (const key of Object.keys(n)) {
      if (
        key === 'loc' ||
        key === 'start' ||
        key === 'end' ||
        key === 'comments' ||
        key === 'leadingComments' ||
        key === 'trailingComments' ||
        key === 'innerComments'
      )
        continue;
      const child = n[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item);
      } else if (child && typeof child === 'object') {
        walk(child);
      }
    }
  }
  walk(node);
  return Array.from(deps);
}

/**
 * Parses source code into a map of semantic symbol nodes.
 */
export function parseSourceToSymbols(filename: string, code: string): AstParseResult {
  const symbols = new Map<string, SymbolNode>();

  let ast: t.File;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'asyncGenerators',
        'dynamicImport',
        'objectRestSpread',
      ],
    });
  } catch (err: any) {
    // Fallback for non-TS/JS files (e.g. JSON, raw text): wrap as single statement
    const hash = computeHash(code);
    symbols.set(`file:${filename}`, {
      id: `file:${filename}`,
      kind: 'statement',
      name: filename,
      code,
      hash,
      dependencies: [],
      order: 0,
    });
    return { filename, symbols, rawAstAvailable: false };
  }

  let orderIndex = 0;

  for (const node of ast.program.body) {
    orderIndex++;
    if (t.isImportDeclaration(node)) {
      const source = node.source.value;
      const nodeCode = generate(node).code;
      const id = `import:${source}`;
      symbols.set(id, {
        id,
        kind: 'import',
        name: source,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: [],
        order: orderIndex,
      });
    } else if (
      t.isFunctionDeclaration(node) ||
      (t.isExportNamedDeclaration(node) && t.isFunctionDeclaration(node.declaration))
    ) {
      const funcDecl = t.isFunctionDeclaration(node)
        ? node
        : (node.declaration as t.FunctionDeclaration);
      const name = funcDecl.id?.name || `anonymous_${orderIndex}`;
      const nodeCode = generate(node).code;
      const id = `func:${name}`;
      symbols.set(id, {
        id,
        kind: 'function',
        name,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    } else if (
      t.isTSInterfaceDeclaration(node) ||
      (t.isExportNamedDeclaration(node) && t.isTSInterfaceDeclaration(node.declaration))
    ) {
      const ifaceDecl = t.isTSInterfaceDeclaration(node)
        ? node
        : (node.declaration as t.TSInterfaceDeclaration);
      const name = ifaceDecl.id.name;
      const nodeCode = generate(node).code;
      const id = `interface:${name}`;
      symbols.set(id, {
        id,
        kind: 'interface',
        name,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    } else if (
      t.isTSTypeAliasDeclaration(node) ||
      (t.isExportNamedDeclaration(node) && t.isTSTypeAliasDeclaration(node.declaration))
    ) {
      const typeDecl = t.isTSTypeAliasDeclaration(node)
        ? node
        : (node.declaration as t.TSTypeAliasDeclaration);
      const name = typeDecl.id.name;
      const nodeCode = generate(node).code;
      const id = `type:${name}`;
      symbols.set(id, {
        id,
        kind: 'type',
        name,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    } else if (
      t.isClassDeclaration(node) ||
      (t.isExportNamedDeclaration(node) && t.isClassDeclaration(node.declaration))
    ) {
      const classDecl = t.isClassDeclaration(node)
        ? node
        : (node.declaration as t.ClassDeclaration);
      const name = classDecl.id?.name || `Class_${orderIndex}`;
      const nodeCode = generate(node).code;
      const id = `class:${name}`;
      symbols.set(id, {
        id,
        kind: 'class',
        name,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    } else if (
      t.isVariableDeclaration(node) ||
      (t.isExportNamedDeclaration(node) && t.isVariableDeclaration(node.declaration))
    ) {
      const varDecl = t.isVariableDeclaration(node)
        ? node
        : (node.declaration as t.VariableDeclaration);
      const names = varDecl.declarations
        .map((d) => (t.isIdentifier(d.id) ? d.id.name : null))
        .filter(Boolean)
        .join('_');
      const name = names || `var_${orderIndex}`;
      const nodeCode = generate(node).code;
      const id = `var:${name}`;
      symbols.set(id, {
        id,
        kind: 'variable',
        name,
        code: nodeCode,
        hash: computeHash(nodeCode),
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    } else {
      const nodeCode = generate(node).code;
      const codeHash = computeHash(nodeCode);
      const id = `stmt:${codeHash}`;
      symbols.set(id, {
        id,
        kind: 'statement',
        name: `stmt_${codeHash.slice(0, 6)}`,
        code: nodeCode,
        hash: codeHash,
        dependencies: extractDependencies(node),
        order: orderIndex,
      });
    }
  }

  return { filename, symbols, rawAstAvailable: true };
}

/**
 * Reconstructs source code from a set of symbol nodes in a clean, consistent order.
 */
export function symbolsToSource(filename: string, symbols: Map<string, SymbolNode>): string {
  if (symbols.has(`file:${filename}`)) {
    return symbols.get(`file:${filename}`)!.code;
  }

  const nodes = Array.from(symbols.values());

  // Deterministic ordering:
  // 1. Imports
  // 2. Types & Interfaces
  // 3. Variables / Constants
  // 4. Functions & Classes
  // 5. Other statements
  const kindPriority: Record<SymbolKind, number> = {
    import: 1,
    type: 2,
    interface: 3,
    variable: 4,
    class: 5,
    function: 6,
    statement: 7,
  };

  nodes.sort((a, b) => {
    const prioDiff = (kindPriority[a.kind] || 99) - (kindPriority[b.kind] || 99);
    if (prioDiff !== 0) return prioDiff;
    return a.order - b.order;
  });

  return nodes.map((n) => n.code).join('\n\n') + '\n';
}

/**
 * 3-Way AST Semantic Merge:
 * Combines Base, Agent A's changes, and Agent B's changes at the symbol level.
 */
export function mergeSymbolMaps(
  base: Map<string, SymbolNode>,
  branchA: { agentId: string; symbols: Map<string, SymbolNode> },
  branchB: { agentId: string; symbols: Map<string, SymbolNode> },
  filename: string
): AstMergeResult {
  const mergedSymbols = new Map<string, SymbolNode>();
  const cleanMerges: string[] = [];
  const conflicts: SymbolConflict[] = [];

  const allSymbolIds = new Set<string>([
    ...base.keys(),
    ...branchA.symbols.keys(),
    ...branchB.symbols.keys(),
  ]);

  for (const id of allSymbolIds) {
    const baseNode = base.get(id);
    const nodeA = branchA.symbols.get(id);
    const nodeB = branchB.symbols.get(id);

    // Case 1: Unchanged in both branches
    if (
      baseNode &&
      nodeA &&
      nodeB &&
      nodeA.hash === baseNode.hash &&
      nodeB.hash === baseNode.hash
    ) {
      mergedSymbols.set(id, baseNode);
      continue;
    }

    // Case 2: Only Branch A touched or added it
    if (nodeA && (!baseNode || nodeA.hash !== baseNode.hash) && (!nodeB || (baseNode && nodeB.hash === baseNode.hash))) {
      mergedSymbols.set(id, nodeA);
      cleanMerges.push(id);
      continue;
    }

    // Case 3: Only Branch B touched or added it
    if (nodeB && (!baseNode || nodeB.hash !== baseNode.hash) && (!nodeA || (baseNode && nodeA.hash === baseNode.hash))) {
      mergedSymbols.set(id, nodeB);
      cleanMerges.push(id);
      continue;
    }

    // Case 4: Both added or modified it identically
    if (nodeA && nodeB && nodeA.hash === nodeB.hash) {
      mergedSymbols.set(id, nodeA);
      cleanMerges.push(id);
      continue;
    }

    // Case 5: Branch A deleted it, Branch B untouched it
    if (!nodeA && baseNode && nodeB && nodeB.hash === baseNode.hash) {
      cleanMerges.push(id);
      continue; // Delete it
    }

    // Case 6: Branch B deleted it, Branch A untouched it
    if (!nodeB && baseNode && nodeA && nodeA.hash === baseNode.hash) {
      cleanMerges.push(id);
      continue; // Delete it
    }

    // Case 7: Real Collision (both modified or added different code for the same symbol)
    if (nodeA && nodeB && nodeA.hash !== nodeB.hash) {
      conflicts.push({
        symbolId: id,
        name: nodeA.name || id,
        kind: nodeA.kind,
        baseCode: baseNode?.code,
        versionA: { agentId: branchA.agentId, code: nodeA.code, hash: nodeA.hash },
        versionB: { agentId: branchB.agentId, code: nodeB.code, hash: nodeB.hash },
        reason: `Concurrent divergent modifications to symbol ${id}`,
      });
      // Temporarily preserve Branch A's version until Arbiter resolves it
      mergedSymbols.set(id, nodeA);
    }
  }

  const mergedCode = symbolsToSource(filename, mergedSymbols);

  return {
    mergedSymbols,
    mergedCode,
    cleanMerges,
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
