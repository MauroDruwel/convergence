declare module 'diff3' {
  export interface Diff3OkChunk {
    ok: string[];
    conflict?: never;
  }

  export interface Diff3ConflictChunk {
    ok?: never;
    conflict: {
      a: string[];
      b: string[];
      o: string[];
      aIndex: number;
      bIndex: number;
      oIndex: number;
    };
  }

  export type Diff3Chunk = Diff3OkChunk | Diff3ConflictChunk;

  function diff3(ours: string[], base: string[], theirs: string[]): Diff3Chunk[];
  export default diff3;
}
