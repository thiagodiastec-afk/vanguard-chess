// Transposition Table implementation

export enum Bound {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

export interface TTEntry {
  hash: number;
  depth: number;
  score: number;
  bound: Bound;
  bestMove?: string;
}

export class TranspositionTable {
  private table: Map<number, TTEntry>;
  private maxSize: number;

  public probes = 0;
  public hits = 0;
  public exactHits = 0;
  public boundHits = 0;
  public cutoffs = 0;
  public stores = 0;
  public replacements = 0;

  constructor(maxSize: number = 1000000) {
    this.table = new Map();
    this.maxSize = maxSize;
  }

  public clear() {
    this.table.clear();
    this.probes = 0;
    this.hits = 0;
    this.exactHits = 0;
    this.boundHits = 0;
    this.cutoffs = 0;
    this.stores = 0;
    this.replacements = 0;
  }

  public probe(hash: number): TTEntry | undefined {
    this.probes++;
    const entry = this.table.get(hash);
    if (entry !== undefined) {
      this.hits++;
    }
    return entry;
  }

  public store(hash: number, depth: number, score: number, bound: Bound, bestMove?: string) {
    this.stores++;
    const existing = this.table.get(hash);

    if (existing) {
      // Replace strategy: Always replace if depth is greater or equal
      // Or if it's an exact bound replacing a lower/upper bound of same depth.
      if (depth >= existing.depth) {
        this.replacements++;
        this.table.set(hash, { hash, depth, score, bound, bestMove: bestMove || existing.bestMove });
      }
    } else {
      if (this.table.size >= this.maxSize) {
        // Simple replacement strategy: clear when full or replace random (map iterator is fast)
        // A Map iterates in insertion order, so getting the first key is like a pseudo-LRU
        const firstKey = this.table.keys().next().value;
        if (firstKey !== undefined) {
            this.table.delete(firstKey);
        }
      }
      this.table.set(hash, { hash, depth, score, bound, bestMove });
    }
  }

  public get size(): number {
    return this.table.size;
  }

  public get capacity(): number {
    return this.maxSize;
  }
}
