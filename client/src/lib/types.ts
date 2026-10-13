export type QuestionType = 'multiple-choice' | 'true-false';
export type PointsMode = 'standard' | 'double' | 'none';
export type Phase = 'lobby' | 'countdown' | 'question' | 'results' | 'leaderboard' | 'podium';

export interface Option { id: string; text: string; correct: boolean }
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timeLimit: number;
  points: PointsMode;
  options: Option[];
}
export interface Quiz {
  id: string;
  title: string;
  description: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}
export interface QuizSummary {
  id: string;
  title: string;
  description: string;
  emoji: string;
  questionCount: number;
  updatedAt: string;
  ready: boolean;
  problems: string[];
}

export interface LeaderRow {
  id: string; name: string; score: number; rank: number;
  gained: number; delta: number; streak: number;
}

export interface HostState {
  role: 'host';
  code: string;
  phase: Phase;
  quiz: { id: string; title: string; emoji: string };
  index: number;
  total: number;
  endsAt: number;
  serverNow: number;
  question: (Omit<Question, 'options'> & { options: Option[] }) | null;
  answeredCount: number;
  playerCount: number;
  players: { id: string; name: string; connected: boolean }[];
  tally: { optionId: string; count: number }[] | null;
  leaderboard: LeaderRow[];
  stats: { questions: number; players: number; accuracy: number };
}

export interface PlayerState {
  role: 'player';
  code: string;
  phase: Phase;
  quiz: { title: string; emoji: string };
  index: number;
  total: number;
  endsAt: number;
  serverNow: number;
  question: {
    id: string; type: QuestionType; text: string; timeLimit: number; points: PointsMode;
    options: { id: string; index: number; text: string; correct?: boolean }[];
  } | null;
  me: { id: string; name: string; score: number; streak: number; rank: number; gained: number; delta: number } | null;
  myAnswer: { optionId: string; correct?: boolean; points?: number } | null;
  playerCount: number;
  answeredCount: number;
  podium: LeaderRow[] | null;
  nearby: LeaderRow[] | null;
}
