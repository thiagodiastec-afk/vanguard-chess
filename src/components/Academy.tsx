import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Crown, Lightbulb, Loader2, RotateCcw, Sparkles, Target } from 'lucide-react';
import { UserData } from '../types';
import { authenticatedApiFetch } from '../lib/api';
import { useTheme } from '../lib/themes';
import { getCustomPieces } from '../lib/chessPieces';
import type { AcademyLesson, AcademyProgress } from '../lib/academyTypes';

interface AcademyProps {
  currentUser: UserData;
  onOpenStore: () => void;
  onBack: () => void;
}

const LEVELS = ['Fundamentos', 'Intermediário', 'Avançado', 'Mestre'] as const;

export default function Academy({ currentUser, onOpenStore, onBack }: AcademyProps) {
  const theme = useTheme();
  const hasActivePremium = Boolean(currentUser.isPremium && currentUser.premiumUntil && currentUser.premiumUntil > Date.now());
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [progress, setProgress] = useState<AcademyProgress>({ completedLessonIds: [], xp: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fen, setFen] = useState('');
  const [expectedMoveIndex, setExpectedMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasActivePremium) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setCourseError('');
    let active = true;
    authenticatedApiFetch('/api/academy/course')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível abrir a Academia.');
        if (!active) return;
        setLessons(data.lessons);
        setProgress(data.progress);
        setSelectedId(data.lessons.find((lesson: AcademyLesson) => !data.progress.completedLessonIds.includes(lesson.id))?.id ?? data.lessons[0]?.id ?? null);
      })
      .catch(error => { if (active) setCourseError(error instanceof Error ? error.message : 'Erro ao carregar o curso.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (replyTimer.current) clearTimeout(replyTimer.current); };
  }, [hasActivePremium]);

  const lesson = useMemo(() => lessons.find(item => item.id === selectedId) ?? null, [lessons, selectedId]);

  useEffect(() => {
    if (!lesson) return;
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setFen(lesson.fen);
    setExpectedMoveIndex(0);
    setSolved(false);
    setShowHint(false);
    setFeedback('');
    setSaveError('');
    setIsReplying(false);
  }, [lesson]);

  const isCompleted = Boolean(lesson && progress.completedLessonIds.includes(lesson.id));

  const finishLesson = async () => {
    if (!lesson) return;
    setSolved(true);
    if (isCompleted) return;
    setSaving(true);
    setSaveError('');
    try {
      const response = await authenticatedApiFetch('/api/academy/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar seu progresso.');
      setProgress(data.progress);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar seu progresso.');
    } finally {
      setSaving(false);
    }
  };

  const onDrop = (sourceOrArgs: any, targetArg?: string) => {
    if (!lesson || solved || saving || isReplying) return false;
    const source = typeof sourceOrArgs === 'object' ? sourceOrArgs.sourceSquare : sourceOrArgs;
    const target = typeof sourceOrArgs === 'object' ? sourceOrArgs.targetSquare : targetArg;
    if (!source || !target) return false;

    try {
      const nextGame = new Chess(fen);
      const move = nextGame.move({ from: source, to: target, promotion: 'q' });
      if (!move) return false;
      const expectedSan = lesson.line[expectedMoveIndex];
      const accepted = expectedMoveIndex === 0 && lesson.acceptedFirstMoves?.length
        ? lesson.acceptedFirstMoves
        : [expectedSan];
      if (!accepted.includes(move.san)) {
        setFeedback('Esse lance é legal, mas não resolve o tema desta aula. Veja a dica e tente outra ideia.');
        return false;
      }

      setFeedback('');
      setFen(nextGame.fen());
      const nextIndex = expectedMoveIndex + 1;
      if (nextIndex >= lesson.line.length) {
        void finishLesson();
      } else {
        setIsReplying(true);
        replyTimer.current = setTimeout(() => {
          const replyGame = new Chess(nextGame.fen());
          replyGame.move(lesson.line[nextIndex]);
          setFen(replyGame.fen());
          setIsReplying(false);
          const followingIndex = nextIndex + 1;
          setExpectedMoveIndex(followingIndex);
          if (followingIndex >= lesson.line.length) void finishLesson();
        }, 450);
      }
      setExpectedMoveIndex(nextIndex);
      return true;
    } catch {
      return false;
    }
  };

  const resetLesson = () => {
    if (!lesson) return;
    if (replyTimer.current) clearTimeout(replyTimer.current);
    setFen(lesson.fen);
    setExpectedMoveIndex(0);
    setSolved(false);
    setFeedback('');
    setShowHint(false);
    setSaveError('');
    setIsReplying(false);
  };

  const completedCount = progress.completedLessonIds.length;
  const progressPercent = lessons.length ? Math.round(completedCount / lessons.length * 100) : 0;
  const boardOrientation = lesson && new Chess(lesson.fen).turn() === 'b' ? 'black' : 'white';

  if (loading) return <div className="flex-1 min-h-[50vh] flex items-center justify-center text-amber-300"><Loader2 className="w-7 h-7 animate-spin mr-3" />Abrindo sua Academia…</div>;

  if (!hasActivePremium) return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8">
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/40 p-7 sm:p-12 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-300/20 flex items-center justify-center mx-auto mb-5"><Crown className="w-8 h-8 text-amber-300" /></div>
        <p className="text-amber-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Benefício VIP</p>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Sua jornada do primeiro lance ao mestre</h1>
        <p className="max-w-2xl mx-auto mt-4 text-neutral-300 leading-relaxed">A Academia ensina princípios de abertura, tática, finais e combinações avançadas com posições interativas, dicas e explicações. O curso completo está incluído na assinatura VIP mensal.</p>
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto my-7 text-left">
          {['12 aulas interativas em quatro níveis', 'Dicas antes de revelar a solução', 'Explicação do plano por trás do lance', 'Progresso e pontos salvos na sua conta'].map(item => <div key={item} className="rounded-xl bg-black/25 border border-white/10 p-4 flex gap-3 text-sm text-neutral-200"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />{item}</div>)}
        </div>
        <button onClick={onOpenStore} className="rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black px-7 py-4 shadow-lg shadow-amber-950/30">Conhecer VIP · R$ 9,90/mês</button>
        <p className="mt-3 text-xs text-neutral-500">A cobrança é processada pelo Mercado Pago. A Academia é liberada após a confirmação do pagamento.</p>
      </div>
    </div>
  );

  if (courseError) return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-neutral-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar ao treino</button>
      <div className="rounded-2xl border border-red-500/30 bg-neutral-900 p-8 text-center">
        <Crown className="w-10 h-10 text-amber-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Não foi possível abrir a Academia</h2>
        <p className="text-neutral-400">{courseError}</p>
      </div>
    </div>
  );

  if (!lesson) return <div className="flex-1 p-8 text-center text-neutral-400">Nenhuma aula disponível.</div>;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-neutral-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar ao treino</button>
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-neutral-900 to-amber-950/20 p-5 sm:p-7 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-amber-300 text-sm font-bold uppercase tracking-wider mb-2"><Crown className="w-4 h-4" />Academia Vanguard · VIP</div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Aprenda do primeiro lance aos padrões de mestre</h1>
              <p className="text-neutral-400 mt-2">Aulas interativas, dicas, explicações e progresso salvo na sua conta.</p>
            </div>
            <div className="min-w-44 rounded-xl bg-black/30 border border-white/10 p-4">
              <div className="flex justify-between text-sm mb-2"><span className="text-neutral-300">Seu progresso</span><span className="text-amber-300 font-bold">{completedCount}/{lessons.length}</span></div>
              <div className="h-2 rounded-full bg-neutral-800 overflow-hidden"><div className="h-full bg-amber-400 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              <div className="text-xs text-neutral-500 mt-2">{progress.xp} pontos de aprendizado</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <aside className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 h-fit">
            <h2 className="text-white font-bold flex items-center gap-2 px-2 mb-4"><BookOpen className="w-5 h-5 text-amber-300" />Trilha de aprendizado</h2>
            <div className="space-y-5">
              {LEVELS.map(level => {
                const levelLessons = lessons.filter(item => item.level === level);
                if (!levelLessons.length) return null;
                return <section key={level}>
                  <h3 className="text-[11px] uppercase tracking-widest text-neutral-500 font-bold px-2 mb-2">{level}</h3>
                  <div className="space-y-1">
                    {levelLessons.map(item => {
                      const done = progress.completedLessonIds.includes(item.id);
                      const selected = item.id === selectedId;
                      return <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full text-left rounded-xl px-3 py-3 flex items-center gap-3 transition-colors ${selected ? 'bg-amber-400/10 border border-amber-400/30 text-amber-100' : 'border border-transparent hover:bg-neutral-800 text-neutral-300'}`}>
                        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <span className="w-4 h-4 rounded-full border border-neutral-600 shrink-0" />}
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{item.title}</span><span className="block text-xs text-neutral-500 truncate">{item.concept}</span></span>
                        {selected && <ChevronRight className="w-4 h-4 text-amber-300" />}
                      </button>;
                    })}
                  </div>
                </section>;
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-neutral-800">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3"><span className="rounded-full bg-amber-400/10 text-amber-300 px-3 py-1">{lesson.level}</span><span className="text-neutral-500">{lesson.concept}</span></div>
              <h2 className="text-2xl font-black text-white">{lesson.title}</h2>
              <p className="text-neutral-300 mt-2">{lesson.instruction}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,520px)_minmax(0,1fr)] gap-6 p-4 sm:p-7">
              <div className="w-full max-w-[520px] mx-auto rounded-xl border-4 border-[#613318] bg-[#1a0c06] p-2 shadow-2xl">
                {/* @ts-ignore react-chessboard v5 callback typings are incompatible with runtime */}
                <Chessboard options={{ id: 'AcademyLesson', position: fen, boardOrientation, onPieceDrop: onDrop, darkSquareStyle: theme.darkSquareStyle, lightSquareStyle: theme.lightSquareStyle, pieces: getCustomPieces(theme.pieceSet || 'wood'), animationDurationInMs: 250 }} />
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold mb-3"><Target className="w-5 h-5" />Sua missão</div>
                  <p className="text-neutral-300 text-sm leading-relaxed">{solved ? 'Muito bem. Agora veja por que esse lance funciona:' : `Jogue com as peças ${boardOrientation === 'white' ? 'brancas' : 'pretas'} no tabuleiro. Pense no tema antes de mover.`}</p>
                  {showHint && !solved && <p className="mt-3 rounded-lg bg-amber-400/10 border border-amber-400/20 p-3 text-sm text-amber-100"><Lightbulb className="w-4 h-4 inline mr-2" />{lesson.hint}</p>}
                  {feedback && !solved && <p className="mt-3 text-sm text-rose-300">{feedback}</p>}
                  {solved && <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4"><div className="flex items-center gap-2 text-emerald-300 font-bold mb-2"><CheckCircle2 className="w-5 h-5" />Aula concluída · +{lesson.xp} pontos</div><p className="text-sm text-neutral-200 leading-relaxed">{lesson.explanation}</p></div>}
                  {saveError && <div className="mt-3 text-sm text-rose-300">{saveError}<button onClick={() => void finishLesson()} className="ml-2 underline hover:text-white">Tentar salvar novamente</button></div>}
                  {saving && <p className="mt-3 text-sm text-amber-300 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Salvando seu progresso…</p>}
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {!solved ? <>
                    <button onClick={() => setShowHint(true)} className="flex-1 min-w-36 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-3 text-sm font-bold text-neutral-100 flex justify-center items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-300" />Mostrar dica</button>
                    <button onClick={resetLesson} className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-bold text-neutral-400 hover:text-white flex items-center gap-2"><RotateCcw className="w-4 h-4" />Reiniciar</button>
                  </> : <button onClick={() => {
                    const index = lessons.findIndex(item => item.id === lesson.id);
                    setSelectedId(lessons[(index + 1) % lessons.length].id);
                  }} className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-3 font-black text-neutral-950 flex items-center justify-center gap-2">Próxima aula<Sparkles className="w-4 h-4" /></button>}
                </div>
                <div className="text-xs text-neutral-600">Aluno: {currentUser.displayName}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
