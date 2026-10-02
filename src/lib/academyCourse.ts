import { Chess } from 'chess.js';
import type { AcademyLesson } from './academyTypes';

function positionAfter(moves: string[]): string {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game.fen();
}

// Lessons are delivered by the authenticated API and are available to every signed-in player.
export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'basics-center', level: 'Iniciante', title: 'Domine o centro', concept: 'Princípios de abertura',
    instruction: 'Na posição inicial, avance um peão central para disputar espaço e abrir linhas para suas peças.',
    fen: new Chess().fen(), line: ['e4'], acceptedFirstMoves: ['e4', 'd4'],
    hint: 'Escolha o peão da coluna e ou d.',
    explanation: 'Peões em e4 ou d4 ocupam o centro, liberam diagonais para bispos e abrem caminho para o desenvolvimento.', xp: 10
  },
  {
    id: 'develop-knight', level: 'Iniciante', title: 'Desenvolva com propósito', concept: 'Desenvolvimento de peças',
    instruction: 'Depois de 1.e4 e5, desenvolva uma peça menor e pressione o peão e5.',
    fen: positionAfter(['e4', 'e5']), line: ['Nf3'],
    hint: 'O cavalo de g1 pode atacar e5 e controlar casas centrais.',
    explanation: 'Nf3 desenvolve uma peça, ataca e5 e prepara o roque. Evite mover a mesma peça várias vezes sem necessidade.', xp: 10
  },
  {
    id: 'castle-safely', level: 'Iniciante', title: 'Coloque o rei em segurança', concept: 'Roque',
    instruction: 'As peças já abriram espaço. Faça o roque curto para proteger o rei e ativar a torre.',
    fen: positionAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']), line: ['O-O'],
    hint: 'O rei e a torre do lado do rei podem se mover juntos nesta posição.',
    explanation: 'O roque tira o rei do centro e conecta as torres. Faça-o depois de liberar as casas entre rei e torre.', xp: 10
  },
  {
    id: 'mate-pastor', level: 'Intermediário', title: 'Ataque um ponto vulnerável', concept: 'Coordenação de peças',
    instruction: 'A dama e o bispo miram f7. Encontre o lance que conclui o ataque.',
    fen: positionAfter(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']), line: ['Qxf7#'],
    hint: 'A casa f7 está protegida pelo bispo branco em c4.',
    explanation: 'O xeque-mate funciona porque dama e bispo atacam juntos. O padrão ensina coordenação; contra uma defesa atenta, não tente repetir a armadilha sem calcular.', xp: 20
  },
  {
    id: 'win-loose-piece', level: 'Intermediário', title: 'Reconheça uma peça desprotegida', concept: 'Contagem de material',
    instruction: 'Aproveite a peça preta que ficou ao alcance da dama branca.',
    fen: 'r1b1k2r/pppp1ppp/8/8/1b1Q4/2N5/PPP1PPPP/R3KB1R w KQkq - 0 8', line: ['Qxb4'],
    hint: 'Procure uma captura segura da peça em b4.',
    explanation: 'Antes de cada lance, confira quais peças do adversário estão sem defesa e se a captura deixa sua própria dama vulnerável.', xp: 20
  },
  {
    id: 'knight-fork', level: 'Intermediário', title: 'Ataque dois alvos', concept: 'Garfo de cavalo',
    instruction: 'Use o cavalo para dar xeque e atacar uma segunda peça importante ao mesmo tempo.',
    fen: 'r3k2r/pppn1ppp/3b4/3Np3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1', line: ['Nxc7+'],
    hint: 'Um cavalo em c7 pode atacar o rei em e8 e a torre em a8.',
    explanation: 'O garfo cria duas ameaças simultâneas. O adversário precisa responder ao xeque e a torre pode ficar disponível na sequência.', xp: 20
  },
  {
    id: 'discovered-check', level: 'Intermediário', title: 'Abra uma linha com xeque descoberto', concept: 'Ataque descoberto',
    instruction: 'Mova o bispo que está bloqueando a torre. O lance deve descobrir um xeque pela coluna e.',
    fen: '4k3/8/8/8/8/8/4B3/K3R3 w - - 0 1', line: ['Bc4+'],
    hint: 'A torre branca está alinhada com o rei preto; mova o bispo sem fechar essa coluna.',
    explanation: 'No xeque descoberto, uma peça sai da linha e revela o ataque de outra. Antes de escolher a casa de saída, verifique se o lance que move a peça também cria uma ameaça.', xp: 20
  },
  {
    id: 'capture-checker', level: 'Intermediário', title: 'Responda ao xeque capturando o atacante', concept: 'Defesa e cálculo',
    instruction: 'Seu rei está em xeque da dama preta. Encontre a captura legal que elimina a ameaça.',
    fen: '4k3/8/8/8/8/8/3q4/3QK3 w - - 0 1', line: ['Qxd2'],
    hint: 'A dama branca pode capturar a peça que está dando xeque pela diagonal.',
    explanation: 'Um xeque pode ser respondido movendo o rei, bloqueando a linha ou capturando a peça atacante. Compare as opções legais antes de escolher.', xp: 20
  },
  {
    id: 'back-rank', level: 'Profissional', title: 'Explore a última fileira', concept: 'Mate na última fileira',
    instruction: 'O rei preto está preso pelos próprios peões. Encontre o xeque-mate com a torre.',
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', line: ['Rd8#'],
    hint: 'A torre pode entrar na oitava fileira com xeque decisivo.',
    explanation: 'Peões que protegem o rei também podem tirar suas casas de fuga. Procure esse padrão quando o rei estiver encurralado na última fileira.', xp: 30
  },
  {
    id: 'promote-pawn', level: 'Profissional', title: 'Transforme vantagem em vitória', concept: 'Promoção',
    instruction: 'Leve o peão à última fileira e escolha a peça que dá maior vantagem.',
    fen: '8/4P3/8/8/8/8/8/k3K3 w - - 0 1', line: ['e8=Q'],
    hint: 'Um peão que chega à oitava fileira pode virar dama.',
    explanation: 'Na maioria das posições, promover a dama é o caminho mais simples para converter um peão passado em vantagem decisiva.', xp: 30
  },
  {
    id: 'rook-skewer', level: 'Profissional', title: 'Ganhe material com um espeto', concept: 'Espeto',
    instruction: 'Ataque o rei e alinhe a torre preta atrás dele para ganhar material após o rei sair do xeque.',
    fen: 'R7/8/8/3k4/8/8/3r4/4K3 w - - 0 1', line: ['Rd8+'],
    hint: 'A torre branca pode dar xeque pela coluna d.',
    explanation: 'No espeto, a peça mais valiosa é atacada primeiro. Quando ela se afasta, a peça que está atrás pode ser capturada.', xp: 30
  },
  {
    id: 'smothered-mate', level: 'Profissional', title: 'Construa o mate sufocado', concept: 'Rede de mate',
    instruction: 'As próprias peças pretas limitam as fugas do rei. Encontre o xeque-mate de cavalo.',
    fen: '6rk/6pp/3N4/8/8/8/8/4K3 w - - 0 1', line: ['Nf7#'],
    hint: 'O cavalo pode atacar o rei pela casa f7 com xeque.',
    explanation: 'No mate sufocado, o rei não consegue fugir porque as próprias peças ocupam suas casas. O cavalo dá o xeque final sem precisar de apoio direto.', xp: 40
  },
  {
    id: 'arabian-mate', level: 'Profissional', title: 'Finalize com o mate árabe', concept: 'Coordenação torre e cavalo',
    instruction: 'A torre e o cavalo cercam o rei no canto. Encontre o lance final da combinação.',
    fen: '7k/R7/5N2/8/8/8/8/4K3 w - - 0 1', line: ['Rh7#'],
    hint: 'A torre branca da sétima fileira pode entrar em h7.',
    explanation: 'No mate árabe, a torre controla a fileira de fuga e o cavalo cobre as casas próximas ao rei. A coordenação das duas peças fecha a rede.', xp: 40
  },
  {
    id: 'queen-endgame-mate', level: 'Profissional', title: 'Conclua com precisão', concept: 'Mate com dama e rei',
    instruction: 'Com dama e rei contra um rei solitário, encontre o lance que encerra a partida imediatamente.',
    fen: '8/8/8/8/8/1k6/8/K1q5 b - - 0 1', line: ['Qb2#'],
    hint: 'A dama pode dar mate na diagonal perto do rei branco.',
    explanation: 'A dama controla as casas de fuga enquanto o rei preto protege a peça. Em finais, aproxime o próprio rei para evitar afogamento e mate com segurança.', xp: 40
  }
];

export const ACADEMY_LESSON_IDS = ACADEMY_LESSONS.map(lesson => lesson.id);
