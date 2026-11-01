import { Chess } from 'chess.js';
const fail = (message: string, statusCode = 400): never => { throw Object.assign(new Error(message), { statusCode }); };
export function spectatorPreference(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') return fail('Escolha uma visibilidade válida.');
  return value;
}
/** Only unrated, owner-authored snapshots; never route these through rated moves/results. */
export function computerBroadcastPatch(existing: any, uid: string, input: any, profile: any, now = Date.now()) {
  if (existing && (existing.mode !== 'computer' || existing.ownerId !== uid)) return fail('Sem acesso a esta transmissão.', 403);
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 0) return fail('Sequência inválida.');
  if (existing && (existing.broadcastSequence >= input.sequence || existing.status !== 'playing')) return null;
  if (typeof input.pgn !== 'string' || input.pgn.length > 100000 || !['w','b'].includes(input.playerColor)) return fail('Partida inválida.');
  if (typeof input.ended !== 'boolean' || !['iniciante','facil','medio','dificil','profissional'].includes(input.difficulty)) return fail('Partida inválida.');
  const chess = new Chess();
  try { if (input.pgn) chess.loadPgn(input.pgn); } catch { return fail('Lances inválidos.'); }
  if (chess.history().length > 2000) return fail('Partida longa demais.');
  const white = input.playerColor === 'w';
  const botName = 'Computador (' + input.difficulty + ')';
  const humanName = String(profile.displayName || 'Jogador').slice(0,40);
  return { mode: 'computer', ownerId: uid, whiteId: white ? uid : 'computer', blackId: white ? 'computer' : uid,
    whiteName: white ? humanName : botName, blackName: white ? botName : humanName,
    whiteElo: white ? Number(profile.elo) || 1200 : 0, blackElo: white ? 0 : Number(profile.elo) || 1200,
    status: input.ended ? 'abandoned' : chess.isCheckmate() ? (chess.turn() === 'w' ? 'black_won' : 'white_won') : chess.isDraw() ? 'draw' : 'playing',
    fen: chess.fen(), pgn: chess.pgn(), turn: chess.turn(), lastMoveAt: now, broadcastUpdatedAt: now,
    broadcastSequence: input.sequence, spectatorsAllowedWhite: true, spectatorsAllowedBlack: true, resultsRecorded: true };
}
