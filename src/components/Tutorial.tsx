import React, { useState, useEffect } from 'react';
import { Joyride, Step, STATUS, ACTIONS, EVENTS } from 'react-joyride';

interface TutorialProps {
  inGame: boolean;
}

export default function Tutorial({ inGame }: TutorialProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const hasSeenLobbyTutorial = localStorage.getItem('vanguard-tutorial-lobby');
    const hasSeenGameTutorial = localStorage.getItem('vanguard-tutorial-game');
    
    // Slight delay so UI can render
    const t = setTimeout(() => {
      if (!inGame && !hasSeenLobbyTutorial) {
        setRun(true);
      } else if (inGame && !hasSeenGameTutorial) {
        setStepIndex(2); // Start at game steps
        setRun(true);
      }
    }, 1000);
    
    return () => clearTimeout(t);
  }, [inGame]);

  const steps: any[] = [
    // LOBBY STEPS (0, 1)
    {
      target: '#tutorial-play-ai',
      content: 'Bem-vindo ao Vanguard Chess! Aqui você pode iniciar uma partida contra a Inteligência Artificial para treinar.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '#tutorial-pass-play',
      content: 'Ou jogar no modo Pass & Play, compartilhando o mesmo dispositivo!',
      placement: 'top',
    },
    
    // GAME STEPS (3, 4, 5, 6)
    {
      target: '#tutorial-chessboard',
      content: 'Este é o seu tabuleiro! Arraste as peças para fazer suas jogadas.',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '#tutorial-eval-bar',
      content: 'A barra de avaliação mostra quem está com a vantagem na partida.',
      placement: 'left',
    },
    {
      target: '#tutorial-move-history',
      content: 'Aqui você acompanha o histórico de lances e a notação da partida.',
      placement: 'left',
    },
    {
      target: '#tutorial-captured-pieces',
      content: 'As peças capturadas aparecerão aqui, para você contar seu material extra.',
      placement: 'bottom',
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status, type, index, action } = data;
    
    if (action === ACTIONS.CLOSE || status === STATUS.SKIPPED) {
      setRun(false);
      if (!inGame) localStorage.setItem('vanguard-tutorial-lobby', 'true');
      if (inGame) localStorage.setItem('vanguard-tutorial-game', 'true');
    }
    
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // If we finished lobby steps
      if (index === 1 && !inGame) {
        setRun(false);
        localStorage.setItem('vanguard-tutorial-lobby', 'true');
      } else if (index === steps.length - 1 && inGame) {
        setRun(false);
        localStorage.setItem('vanguard-tutorial-game', 'true');
      } else {
        setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
      }
    }
  };

  const AnyJoyride = Joyride as any;

  return (
    <AnyJoyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableScrolling={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          backgroundColor: '#18181b', // zinc-900
          textColor: '#e4e4e7', // zinc-200
          arrowColor: '#18181b',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '16px',
          border: '1px solid #27272a',
        },
        buttonNext: {
          backgroundColor: '#10b981',
          borderRadius: '8px',
          color: '#09090b',
          fontWeight: 'bold',
        },
        buttonBack: {
          color: '#a1a1aa',
        },
        buttonSkip: {
          color: '#a1a1aa',
        }
      } as any}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
