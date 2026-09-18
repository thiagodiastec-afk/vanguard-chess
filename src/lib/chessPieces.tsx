import React from 'react';

const pieceNames = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

export const getCustomPieces = (pieceSet: string = '3d_staunton') => {
  if (pieceSet === 'default' || pieceSet === 'classic') return undefined;
  
  return pieceNames.reduce((acc, piece) => {
    acc[piece] = ({ squareWidth }: { squareWidth?: number } = {}) => (
      <div 
        className="w-full h-full flex items-center justify-center pointer-events-none select-none relative p-[3%]"
        style={{
          width: squareWidth ? `${squareWidth}px` : '100%',
          height: squareWidth ? `${squareWidth}px` : '100%',
        }}
      >
        <img 
          src={`https://images.chesscomfiles.com/chess-themes/pieces/${pieceSet}/150/${piece.toLowerCase()}.png`} 
          alt={piece}
          className="max-w-[90%] max-h-[90%] w-auto h-auto object-contain pointer-events-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)] transition-transform"
          draggable={false}
          loading="eager"
        />
      </div>
    );
    return acc;
  }, {} as Record<string, any>);
};

export const customPieces = getCustomPieces('3d_staunton');

export const boardStyles = {
  darkSquareStyle: { backgroundColor: '#703816' },
  lightSquareStyle: { backgroundColor: '#dcb588' },
};

