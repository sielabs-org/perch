export type QuestionType = 'multiple-choice' | 'true-false';
export type PointsMode = 'standard' | 'double' | 'none';

export interface Option {
  id: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  timeLimit: number; // seconds
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

export type Phase =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'results'
  | 'leaderboard'
  | 'podium';

export interface Player {
  id: string;
  name: string;
  score: number;
  streak: number;
  bestStreak: number;
  connected: boolean;
  joinedAt: number;
}

export interface Response {
  optionId: string;
  elapsedMs: number;
  correct: boolean;
  points: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  score: number;
  rank: number;
  gained: number;
  delta: number; // rank change vs previous question (positive = moved up)
  streak: number;
}
