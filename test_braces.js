const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
let stack = [];
for(let i=0; i<code.length; i++) {
  if (code[i] === '{') stack.push({char: '{', line: code.substring(0, i).split('\n').length});
  if (code[i] === '(') stack.push({char: '(', line: code.substring(0, i).split('\n').length});
  if (code[i] === '[') stack.push({char: '[', line: code.substring(0, i).split('\n').length});
  
  if (code[i] === '}') {
    if(stack[stack.length-1].char === '{') stack.pop();
    else console.log('Mismatch } at line ' + code.substring(0, i).split('\n').length + ' expected ' + stack[stack.length-1].char);
  }
  if (code[i] === ')') {
    if(stack[stack.length-1].char === '(') stack.pop();
    else console.log('Mismatch ) at line ' + code.substring(0, i).split('\n').length + ' expected ' + stack[stack.length-1].char);
  }
  if (code[i] === ']') {
    if(stack[stack.length-1].char === '[') stack.pop();
    else console.log('Mismatch ] at line ' + code.substring(0, i).split('\n').length + ' expected ' + stack[stack.length-1].char);
  }
}
console.log('Left in stack:', stack.length);
