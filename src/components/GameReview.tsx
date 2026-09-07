import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useTheme } from '../lib/themes';
import { cn } from '../lib/utils';
import { Activity, Target, BrainCircuit, X, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, ArrowUpCircle } from 'lucide-react';
import { customPieces } from '../lib/chessPieces';

interface GameReviewProps {
  pgn: string;
  onClose: () => void;
  playerWhiteName: string;
  playerBlackName: string;
}

export default function GameReview({ pgn, onClose, playerWhiteName, playerBlackName }: GameReviewProps) {
  const theme = useTheme();
  const [chess] = useState(new Chess());
  const [history, setHistory] = useState<any[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisData, setAnalysisData] = useState<any>(null);

  useEffect(() => {
    chess.loadPgn(pgn);
    setHistory(chess.history({ verbose: true }));
    chess.reset(); // go back to start
    setCurrentMoveIndex(-1);
    
    // Start Analysis Worker
    import('../lib/engine.worker?worker').then((WorkerModule) => {
      const worker = new WorkerModule.default();
      
      worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'analyze_result') {
          setAnalysisData(data);
          setIsAnalyzing(false);
          worker.terminate();
        }
      };
      
      worker.postMessage({ type: 'analyze', pgn });
    });
  }, [pgn]);

  const handleNextMove = () => {
    if (currentMoveIndex < history.length - 1) {
      const nextIndex = currentMoveIndex + 1;
      chess.move(history[nextIndex]);
      setCurrentMoveIndex(nextIndex);
    }
  };

  const handlePrevMove = () => {
    if (currentMoveIndex >= 0) {
      chess.undo();
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const getMoveColor = (classification: string) => {
    switch(classification) {
      case 'blunder': return 'text-red-500';
      case 'mistake': return 'text-orange-500';
      case 'inaccuracy': return 'text-yellow-500';
      case 'great': return 'text-cyan-400';
      default: return 'text-emerald-400';
    }
  };

  const getMoveIcon = (classification: string) => {
    switch(classification) {
      case 'blunder': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'mistake': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'inaccuracy': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'great': return <ArrowUpCircle className="w-4 h-4 text-cyan-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  const currentAnalysis = analysisData?.moveClassifications?.[currentMoveIndex];
  
  const whiteStats = analysisData?.moveClassifications.filter((m: any) => m.color === 'w').reduce((acc: any, m: any) => {
    acc[m.classification] = (acc[m.classification] || 0) + 1;
    return acc;
  }, {});
  
  const blackStats = analysisData?.moveClassifications.filter((m: any) => m.color === 'b').reduce((acc: any, m: any) => {
    acc[m.classification] = (acc[m.classification] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex flex-col md:flex-row overflow-hidden">
      {/* Header Mobile */}
      <div className="md:hidden bg-neutral-900 p-4 border-b border-neutral-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />
          Game Review
        </h2>
        <button onClick={onClose} className="p-2 bg-neutral-800 rounded-full text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[500px]">
          <div className="mb-4 flex justify-between items-center bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">
            <span className="font-bold text-white">{playerBlackName} (Pretas)</span>
          </div>
          
          <div className="relative rounded-lg overflow-hidden shadow-2xl border border-neutral-800">
                                    {/* @ts-ignore */}
            <Chessboard 
              options={{
                position: chess.fen(),
                boardOrientation: "white",
                darkSquareStyle: theme.darkSquareStyle,
                lightSquareStyle: theme.lightSquareStyle,
                pieces: customPieces
              }}
            />
          </div>
          
          <div className="mt-4 flex justify-between items-center bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-800">
            <span className="font-bold text-white">{playerWhiteName} (Brancas)</span>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button 
              onClick={handlePrevMove} 
              disabled={currentMoveIndex < 0}
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={handleNextMove} 
              disabled={currentMoveIndex >= history.length - 1}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Analysis */}
      <div className="w-full md:w-[400px] bg-neutral-900 border-l border-neutral-800 flex flex-col">
        <div className="hidden md:flex bg-neutral-900 p-4 border-b border-neutral-800 justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
            Game Review
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAnalyzing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
            <Activity className="w-12 h-12 text-indigo-500 animate-pulse" />
            <h3 className="text-xl font-bold text-white">Analisando Partida...</h3>
            <p className="text-sm text-neutral-400">O Stockfish nativo está processando cada lance no seu navegador.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            {/* Overview Stats */}
            <div className="bg-neutral-800 rounded-2xl p-4 border border-neutral-700/50">
              <h3 className="text-sm font-bold text-neutral-400 mb-4 uppercase tracking-wider text-center">Precisão Estimada</h3>
              <div className="flex justify-between items-center px-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{95 - (whiteStats?.blunder || 0)*5 - (whiteStats?.mistake || 0)*2}%</div>
                  <div className="text-xs text-neutral-500 mt-1">Brancas</div>
                </div>
                <Target className="w-8 h-8 text-neutral-600" />
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{95 - (blackStats?.blunder || 0)*5 - (blackStats?.mistake || 0)*2}%</div>
                  <div className="text-xs text-neutral-500 mt-1">Pretas</div>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-medium">{whiteStats?.great || 0} Brilhantes</span>
                  <span className="text-cyan-400 font-medium">{blackStats?.great || 0} Brilhantes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-medium">{whiteStats?.good || 0} Bons</span>
                  <span className="text-emerald-400 font-medium">{blackStats?.good || 0} Bons</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-500 font-medium">{whiteStats?.inaccuracy || 0} Imprecisões</span>
                  <span className="text-yellow-500 font-medium">{blackStats?.inaccuracy || 0} Imprecisões</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-orange-500 font-medium">{whiteStats?.mistake || 0} Erros</span>
                  <span className="text-orange-500 font-medium">{blackStats?.mistake || 0} Erros</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-500 font-medium">{whiteStats?.blunder || 0} Gafes</span>
                  <span className="text-red-500 font-medium">{blackStats?.blunder || 0} Gafes</span>
                </div>
              </div>
            </div>

            {/* Current Move Analysis */}
            <div className="bg-neutral-800 rounded-2xl p-6 border border-neutral-700/50 flex flex-col items-center justify-center min-h-[200px] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
              
              {currentMoveIndex === -1 ? (
                <>
                  <BrainCircuit className="w-12 h-12 text-neutral-600 mb-4" />
                  <h4 className="text-lg font-bold text-white">Posição Inicial</h4>
                  <p className="text-sm text-neutral-400 mt-2">Avance os lances para ver a análise da IA.</p>
                </>
              ) : currentAnalysis ? (
                <>
                  <div className="flex items-center gap-3 mb-4 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-700">
                    <span className="font-bold text-white text-lg">{currentAnalysis.san}</span>
                    {getMoveIcon(currentAnalysis.classification)}
                  </div>
                  
                  <h4 className={cn("text-2xl font-black mb-2 uppercase tracking-wide", getMoveColor(currentAnalysis.classification))}>
                    {currentAnalysis.classification === 'blunder' && 'GAFE'}
                    {currentAnalysis.classification === 'mistake' && 'ERRO'}
                    {currentAnalysis.classification === 'inaccuracy' && 'IMPRECISÃO'}
                    {currentAnalysis.classification === 'good' && 'BOM LANCE'}
                    {currentAnalysis.classification === 'great' && 'BRILHANTE!'}
                  </h4>
                  
                  <p className="text-sm text-neutral-400">
                    Avaliação: {(currentAnalysis.eval / 100).toFixed(1)}
                  </p>
                </>
              ) : null}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
