import React from 'react';

const pieceNames = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

export const customPieces = pieceNames.reduce((acc, piece) => {
  acc[piece] = () => (
    <svg viewBox="0 0 150 150" width="100%" height="100%">
      <image href={`https://images.chesscomfiles.com/chess-themes/pieces/wood/150/${piece.toLowerCase()}.png`} width="150" height="150" />
    </svg>
  );
  return acc;
}, {} as Record<string, any>);

export const boardStyles = {
  darkSquareStyle: { backgroundColor: '#703816' },
  lightSquareStyle: { backgroundColor: '#dcb588' },
};
