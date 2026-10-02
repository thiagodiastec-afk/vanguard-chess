export type AcademyLevel = 'Iniciante' | 'Intermediário' | 'Profissional';

export interface AcademyLesson {
  id: string;
  level: AcademyLevel;
  title: string;
  concept: string;
  instruction: string;
  fen: string;
  line: string[];
  acceptedFirstMoves?: string[];
  hint: string;
  explanation: string;
  xp: number;
  /** Optional instructor video. Only approved YouTube video IDs are rendered. */
  video?: {
    youtubeId: string;
    title: string;
    instructor: string;
    credential?: string;
  };
}

export interface AcademyProgress {
  completedLessonIds: string[];
  xp: number;
}
