export type AcademyLevel = 'Fundamentos' | 'Intermediário' | 'Avançado' | 'Mestre';

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
}

export interface AcademyProgress {
  completedLessonIds: string[];
  xp: number;
}
