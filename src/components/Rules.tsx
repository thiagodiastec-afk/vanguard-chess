import { BookOpen, AlertCircle, RefreshCw, Crosshair, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Rules() {
  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col gap-8 overflow-y-auto">
      <div className="flex items-center gap-4 bg-neutral-800 p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Manual do Xadrez</h2>
          <p className="text-emerald-400 font-medium mt-1">Regras, movimentos e mecânicas fundamentais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Seção 1 */}
        <section className="bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-neutral-700 pb-4">
            <span className="bg-neutral-700 text-neutral-300 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            O Tabuleiro e a Posição Inicial
          </h3>
          <p className="text-neutral-300 mb-4 leading-relaxed">
            O xadrez é jogado em um tabuleiro de 64 casas alternadas entre claras e escuras (8x8).
          </p>
          <ul className="space-y-4 text-neutral-300 list-none">
            <li className="flex gap-3">
              <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
              <div><strong className="text-white">Orientação:</strong> O tabuleiro deve ser posicionado de modo que a casa no canto inferior direito de cada jogador seja clara.</div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
              <div><strong className="text-white">A Dama na Cor:</strong> Na montagem, a Dama branca começa sempre na casa branca, e a Dama preta na casa preta.</div>
            </li>
            <li className="flex gap-3">
              <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500" />
              <div><strong className="text-white">Início:</strong> As peças brancas sempre fazem o primeiro movimento da partida.</div>
            </li>
          </ul>
        </section>

        {/* Seção 2 */}
        <section className="bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-neutral-700 pb-4">
            <span className="bg-neutral-700 text-neutral-300 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
            Movimentos Básicos de Cada Peça
          </h3>
          <p className="text-neutral-300 mb-6 leading-relaxed bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
            Nenhuma peça pode pular outra, com exceção do Cavalo. Duas peças não podem ocupar a mesma casa.
          </p>
          <div className="space-y-6">
            
            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♔</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Rei</h4>
                <p className="text-neutral-400">Move-se apenas uma casa em qualquer direção (horizontal, vertical ou diagonal). É a peça mais importante: se ele for capturado, o jogo acaba.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♕</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Dama</h4>
                <p className="text-neutral-400">É a peça mais poderosa. Move-se quantas casas quiser em qualquer direção (linha reta ou diagonal).</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♖</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Torre</h4>
                <p className="text-neutral-400">Move-se em linha reta por colunas e fileiras (horizontal e vertical), quantas casas quiser.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♗</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Bispo</h4>
                <p className="text-neutral-400">Move-se apenas nas diagonais, quantas casas quiser. Cada jogador começa com um Bispo de casas claras e outro de casas escuras.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♘</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Cavalo</h4>
                <p className="text-neutral-400">Move-se em "L" (duas casas em uma direção e mais uma em ângulo reto). É a única peça que pode saltar sobre outras peças (amigas ou inimigas).</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-4xl w-10 text-center">♙</div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Peão</h4>
                <p className="text-neutral-400">Move-se apenas uma casa para a frente.</p>
                <ul className="mt-2 space-y-2 text-neutral-400 list-disc ml-5">
                  <li><strong className="text-neutral-300">Exceção:</strong> No seu primeiríssimo movimento no jogo, ele pode avançar duas casas.</li>
                  <li><strong className="text-neutral-300">Captura:</strong> O peão anda para a frente, mas captura na diagonal, uma casa à frente.</li>
                </ul>
              </div>
            </div>
            
          </div>
        </section>

        {/* Seção 3 */}
        <section className="bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-neutral-700 pb-4">
            <span className="bg-neutral-700 text-neutral-300 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
            Movimentos Especiais
          </h3>
          <p className="text-neutral-300 mb-6 leading-relaxed">
            Existem três jogadas especiais com regras muito específicas no xadrez:
          </p>

          <div className="space-y-6">
            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
              <h4 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                O Roque
              </h4>
              <p className="text-neutral-300 mb-3">
                Movimento de defesa para proteger o Rei e ativar a Torre. O Rei anda duas casas em direção à Torre, e a Torre pula o Rei, ficando ao lado dele.
              </p>
              <div className="text-neutral-400 text-sm border-l-2 border-emerald-500/50 pl-3">
                <strong className="text-neutral-200">Condições obrigatórias:</strong> O Rei e a Torre envolvida não podem ter se movido nenhuma vez no jogo; o caminho entre eles deve estar totalmente livre; o Rei não pode estar em xeque, nem passar por uma casa atacada por uma peça adversária.
              </div>
            </div>

            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
              <h4 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <Crosshair className="w-5 h-5" />
                Promoção do Peão
              </h4>
              <p className="text-neutral-300">
                Se um peão conseguir atravessar todo o tabuleiro e chegar à oitava fileira (a última linha do lado adversário), ele é promovido. O jogador deve substituí-lo imediatamente por qualquer outra peça: Dama, Torre, Bispo ou Cavalo (geralmente escolhe-se a Dama).
              </p>
            </div>

            <div className="bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
              <h4 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                En Passant (Em Passagem)
              </h4>
              <p className="text-neutral-300 mb-3">
                Regra especial de captura de peões. Se um peão avançar duas casas no seu primeiro movimento e parar lado a lado com um peão adversário, o adversário pode capturar esse peão avançado movendo-se na diagonal para a casa que o peão pulou.
              </p>
              <div className="text-neutral-400 text-sm border-l-2 border-emerald-500/50 pl-3">
                <strong className="text-neutral-200">Condição obrigatória:</strong> Essa captura deve ser feita imediatamente na jogada seguinte, ou o direito de fazê-la é perdido.
              </div>
            </div>
          </div>
        </section>

        {/* Seção 4 */}
        <section className="bg-neutral-800 p-6 sm:p-8 rounded-2xl border border-neutral-700/50 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-neutral-700 pb-4">
            <span className="bg-neutral-700 text-neutral-300 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            Condições de Fim de Jogo
          </h3>
          <p className="text-neutral-300 mb-6 leading-relaxed">
            A partida de xadrez pode terminar de duas formas: vitória/derrota ou empate.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-bold text-red-400 mb-4 pb-2 border-b border-red-500/20">Vitória (Xeque-mate)</h4>
              <ul className="space-y-4 text-neutral-300 list-none">
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                  <div><strong className="text-white">Xeque:</strong> Ocorre quando o Rei está sendo atacado por uma peça adversária. O jogador é obrigado a salvar o Rei (movendo-o, bloqueando o ataque ou capturando a peça agressora).</div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                  <div><strong className="text-white">Xeque-mate:</strong> Ocorre quando o Rei está em xeque e não existe nenhuma jogada legal para escapar do ataque. O jogo termina imediatamente.</div>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-amber-400 mb-4 pb-2 border-b border-amber-500/20">Empate (Tabela)</h4>
              <p className="text-neutral-400 text-sm mb-3">A partida termina empatada se acontecer uma das seguintes situações:</p>
              <ul className="space-y-4 text-neutral-300 list-none">
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  <div><strong className="text-white">Afogamento:</strong> O Rei do jogador da vez não está em xeque, mas o jogador não tem nenhum movimento legal disponível com nenhuma de suas peças.</div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  <div><strong className="text-white">Insuficiência de Material:</strong> Nenhum dos lados tem peças suficientes para forçar um xeque-mate (ex: Rei contra Rei, ou Rei e Bispo contra Rei).</div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  <div><strong className="text-white">Repetição de Posição:</strong> A mesmíssima posição exata do tabuleiro se repete três vezes ao longo do jogo.</div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  <div><strong className="text-white">Regra dos 50 movimentos:</strong> Se ambos os jogadores passarem 50 lances consecutivos sem mover nenhum peão e sem nenhuma captura acontecer.</div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  <div><strong className="text-white">Acordo:</strong> Os dois jogadores concordam mútuamente com o empate durante a partida.</div>
                </li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
