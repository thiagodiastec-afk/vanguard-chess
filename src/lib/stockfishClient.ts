import { Worker } from 'worker_threads';
import * as path from 'path';

export interface StockfishEvaluation {
  bestMove: string;
  ponder?: string;
  depth: number;
  scoreCp?: number;
  mateIn?: number;
  nodes: number;
  timeMs: number;
  pv: string[];
}

export class StockfishClient {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private messageHandlers: ((msg: string) => void)[] = [];

  constructor() {
    const workerPath = path.resolve('stockfish_node_worker.cjs');
    this.worker = new Worker(workerPath);
    this.worker.on('message', (msg: string) => {
      for (const handler of this.messageHandlers) {
        handler(msg);
      }
    });
    this.worker.on('error', (err) => {
      console.error('Stockfish Worker Error:', err);
    });
  }

  public async init(): Promise<void> {
    return new Promise((resolve) => {
      const handler = (msg: string) => {
        if (msg.includes('readyok')) {
          this.isReady = true;
          this.removeHandler(handler);
          resolve();
        }
      };
      this.addHandler(handler);
      this.worker!.postMessage('uci');
      this.worker!.postMessage('setoption name Contempt value 0'); // Pure objective evaluation
      this.worker!.postMessage('isready');
    });
  }

  private addHandler(handler: (msg: string) => void) {
    this.messageHandlers.push(handler);
  }

  private removeHandler(handler: (msg: string) => void) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  public async evaluate(fen: string, options: { depth?: number; movetime?: number }): Promise<StockfishEvaluation> {
    if (!this.isReady) {
      await this.init();
    }

    return new Promise((resolve) => {
      let lastDepth = 0;
      let lastScoreCp: number | undefined;
      let lastMateIn: number | undefined;
      let lastNodes = 0;
      let lastTimeMs = 0;
      let lastPv: string[] = [];

      const handler = (msg: string) => {
        if (msg.startsWith('info ') && msg.includes('score ')) {
          // Parse info line
          const depthMatch = msg.match(/\bdepth (\d+)/);
          if (depthMatch) lastDepth = parseInt(depthMatch[1], 10);

          const cpMatch = msg.match(/\bscore cp (-?\d+)/);
          if (cpMatch) {
            lastScoreCp = parseInt(cpMatch[1], 10);
            lastMateIn = undefined;
          }

          const mateMatch = msg.match(/\bscore mate (-?\d+)/);
          if (mateMatch) {
            lastMateIn = parseInt(mateMatch[1], 10);
            lastScoreCp = undefined;
          }

          const nodesMatch = msg.match(/\bnodes (\d+)/);
          if (nodesMatch) lastNodes = parseInt(nodesMatch[1], 10);

          const timeMatch = msg.match(/\btime (\d+)/);
          if (timeMatch) lastTimeMs = parseInt(timeMatch[1], 10);

          const pvMatch = msg.match(/\bpv (.+)$/);
          if (pvMatch) lastPv = pvMatch[1].trim().split(/\s+/);
        }

        if (msg.startsWith('bestmove ')) {
          this.removeHandler(handler);
          const parts = msg.split(/\s+/);
          const bestMove = parts[1];
          const ponder = parts[2] === 'ponder' ? parts[3] : undefined;

          resolve({
            bestMove,
            ponder,
            depth: lastDepth,
            scoreCp: lastScoreCp,
            mateIn: lastMateIn,
            nodes: lastNodes,
            timeMs: lastTimeMs,
            pv: lastPv
          });
        }
      };

      this.addHandler(handler);

      this.worker!.postMessage('ucinewgame');
      this.worker!.postMessage(`position fen ${fen}`);
      if (options.depth !== undefined) {
        this.worker!.postMessage(`go depth ${options.depth}`);
      } else if (options.movetime !== undefined) {
        this.worker!.postMessage(`go movetime ${options.movetime}`);
      } else {
        this.worker!.postMessage('go depth 3');
      }
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
    }
  }
}
