import React from 'react';

const pieceNames = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

export const getCustomPieces = (pieceSet: string = 'wood') => {
  if (pieceSet === 'default') return undefined;
  
  // Normalise piece set: 3d_staunton is replaced by centered wooden Staunton pieces
  const actualSet = (!pieceSet || pieceSet === '3d_staunton') ? 'wood' : pieceSet;

  return pieceNames.reduce((acc, piece) => {
    acc[piece] = ({ squareWidth }: { squareWidth?: number } = {}) => (
      <div 
        className="w-full h-full flex items-center justify-center pointer-events-none select-none relative box-border"
        style={{
          width: squareWidth ? `${squareWidth}px` : '100%',
          height: squareWidth ? `${squareWidth}px` : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img 
          src={`https://images.chesscomfiles.com/chess-themes/pieces/${actualSet}/150/${piece.toLowerCase()}.png`} 
          alt={piece}
          className="w-[85%] h-[85%] max-w-full max-h-full object-contain pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform select-none"
          draggable={false}
          loading="eager"
        />
      </div>
    );
    return acc;
  }, {} as Record<string, any>);
};

export const customPieces = getCustomPieces('wood');

export const boardStyles = {
  darkSquareStyle: { backgroundColor: '#703816' },
  lightSquareStyle: { backgroundColor: '#dcb588' },
};

