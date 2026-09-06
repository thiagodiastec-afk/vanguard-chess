import { renderToString } from 'react-dom/server';
import React from 'react';
import { Chessboard } from 'react-chessboard';
const html = renderToString(React.createElement(Chessboard, { position: 'start' }));
console.log("Output without options:", html);
const html2 = renderToString(React.createElement(Chessboard, { options: { position: 'start' } }));
console.log("Output with options:", html2);
