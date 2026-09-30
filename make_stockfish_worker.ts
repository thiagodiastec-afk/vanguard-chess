import * as fs from 'fs';
import * as path from 'path';

const sfPath = path.resolve('node_modules/stockfish.js/stockfish.js');
const code = fs.readFileSync(sfPath, 'utf8');

const wrapper = `
const { parentPort } = require('worker_threads');
global.onmessage = null;
global.postMessage = function(data) {
  if (parentPort) parentPort.postMessage(data);
};
if (parentPort) {
  parentPort.on('message', (data) => {
    if (global.onmessage) global.onmessage({ data });
  });
}
` + code;

fs.writeFileSync('stockfish_node_worker.cjs', wrapper);
console.log('Worker wrapper created: stockfish_node_worker.cjs');
