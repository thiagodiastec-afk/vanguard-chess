/**
 * FASE 5.9 — INTERFACES E TIPOS DA ARQUITETURA DE BACKEND DE TABULEIRO
 *
 * Abstração explícita entre a lógica do motor de busca e a representação
 * interna do tabuleiro (Chess.js legado vs Bitboard experimental).
 */

export type Color = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface BoardPiece {
  type: PieceSymbol;
  color: Color;
}

/**
 * Movimento Interno Universal para a busca do Vanguard Engine.
 * Mantém compatibilidade integral com a estrutura existente de InternalMove.
 */
export interface EngineMove {
  color: Color;
  from: number;          // 0x88 index (0..119) para compatibilidade com o search legado
  to: number;            // 0x88 index (0..119)
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: number;         // Bits de flag
  san?: string;          // Opcional
}

/**
 * Estado salvo para desfazer lances de maneira segura e O(1).
 */
export interface BoardUndoState {
  move: EngineMove;
  prevData: any;
}

/**
 * Interface mínima e explícita necessária para a árvore minimax/quiescence.
 */
export interface BoardBackend {
  readonly backendType: 'chessjs' | 'bitboard';

  loadFEN(fen: string): void;
  getFEN(options?: { forceEnpassantSquare?: boolean }): string;
  getTurn(): Color;

  generateLegalMoves(): EngineMove[];
  makeMove(move: EngineMove): BoardUndoState;
  undoMove(undo: BoardUndoState): void;

  isInCheck(color?: Color): boolean;
  isSquareAttacked(square0x88: number, byColor: Color): boolean;
  isGameOver(): boolean;
  isCheckmate(): boolean;
  isDraw(): boolean;

  /**
   * Representação em matriz 8x8 para funções de avaliação e inspeção estática.
   * board[0][0] = a8 ... board[7][7] = h1
   */
  board(): (BoardPiece | null)[][];

  /**
   * Avaliação estática da posição em centipawns (perspectiva das Brancas).
   */
  evaluate(): number;

  /**
   * Retorna a chave Zobrist da posição atual.
   */
  getZobristHash?(): number;

  clone(): BoardBackend;
}

export type BoardBackendType = 'chessjs' | 'bitboard';

export type ExecutionMode = 'CHESSJS_ONLY' | 'BITBOARD_ONLY' | 'BITBOARD_WITH_ORACLE';
