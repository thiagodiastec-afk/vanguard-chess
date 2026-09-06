import { Chess } from 'chess.js';
const chess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3');
let kingSquare = '';
const turn = chess.turn();
for (let row of chess.board()) {
  for (let piece of row) {
    if (piece && piece.type === 'k' && piece.color === turn) {
      kingSquare = piece.square;
    }
  }
}
console.log('King in check at', kingSquare);
