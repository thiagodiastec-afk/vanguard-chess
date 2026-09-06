import Stockfish from 'stockfish.js';
console.log(typeof Stockfish);
const sf = typeof Stockfish === 'function' ? Stockfish() : new Stockfish();
sf.onmessage = function(event) {
  console.log('MSG', event);
};
sf.postMessage('uci');
