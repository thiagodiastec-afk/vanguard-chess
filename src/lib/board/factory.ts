/**
 * FASE 5.9 — FACTORY DE BACKENDS E CONFIGURAÇÃO CENTRALIZADA
 *
 * Permite alternar de forma limpa, atômica e com zero impacto entre:
 * - Chess.js (referência / legado / fallback)
 * - Bitboard (primário experimental)
 */

import { BoardBackend, BoardBackendType, ExecutionMode } from './types';
import { ChessJsBackend } from './chessJsBackend';
import { BitboardBackend } from './bitboardBackend';

export interface BoardConfig {
  backendType: BoardBackendType;
  executionMode: ExecutionMode;
  dualValidate: boolean;
}

export const boardConfig: BoardConfig = {
  backendType: 'bitboard',
  executionMode: 'BITBOARD_ONLY',
  dualValidate: false
};

export function createBoardBackend(fen?: string, type?: BoardBackendType): BoardBackend {
  let chosenType: BoardBackendType;
  if (type) {
    chosenType = type;
  } else if (boardConfig.executionMode === 'CHESSJS_ONLY') {
    chosenType = 'chessjs';
  } else {
    chosenType = 'bitboard';
  }

  if (chosenType === 'chessjs') {
    return new ChessJsBackend(fen);
  }
  return new BitboardBackend(fen);
}

export function setBoardBackendType(type: BoardBackendType): void {
  boardConfig.backendType = type;
  if (type === 'chessjs') {
    boardConfig.executionMode = 'CHESSJS_ONLY';
  } else {
    boardConfig.executionMode = boardConfig.dualValidate ? 'BITBOARD_WITH_ORACLE' : 'BITBOARD_ONLY';
  }
}

export function setExecutionMode(mode: ExecutionMode): void {
  boardConfig.executionMode = mode;
  if (mode === 'CHESSJS_ONLY') {
    boardConfig.backendType = 'chessjs';
    boardConfig.dualValidate = false;
  } else if (mode === 'BITBOARD_ONLY') {
    boardConfig.backendType = 'bitboard';
    boardConfig.dualValidate = false;
  } else if (mode === 'BITBOARD_WITH_ORACLE') {
    boardConfig.backendType = 'bitboard';
    boardConfig.dualValidate = true;
  }
}

export function setDualValidate(enabled: boolean): void {
  boardConfig.dualValidate = enabled;
  if (boardConfig.executionMode !== 'CHESSJS_ONLY') {
    boardConfig.executionMode = enabled ? 'BITBOARD_WITH_ORACLE' : 'BITBOARD_ONLY';
  }
}

export function captureBackendConfig(): Readonly<BoardConfig> {
  return { ...boardConfig };
}
