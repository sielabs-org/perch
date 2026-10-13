import { nanoid } from 'nanoid';
import type {
  LeaderRow,
  Phase,
  Player,
  Question,
  Quiz,
  Response,
} from '../types.js';

const BASE_POINTS = 1000;
const STREAK_BONUS = 100;
const MAX_STREAK_BONUS = 500;
const COUNTDOWN_MS = 3000;
const LOCK_GRACE_MS = 600; // tolerate network latency on the final answer

export function pointsFor(
  question: Question,
  elapsedMs: number,
  streakBefore: number,
): number {
  if (question.points === 'none') return 0;
  const multiplier = question.points === 'double' ? 2 : 1;
  const limit = question.timeLimit * 1000;
  // Full value answered instantly, decaying linearly to half value at the buzzer.
  const speed = Math.max(0, 1 - Math.min(elapsedMs, limit) / limit);
  const base = Math.round(BASE_POINTS * (0.5 + 0.5 * speed)) * multiplier;
  const bonus = Math.min(streakBefore * STREAK_BONUS, MAX_STREAK_BONUS);
  return base + bonus;
}

export class Session {
  readonly code: string;
  readonly quiz: Quiz;
  hostSocketId: string | null = null;
  phase: Phase = 'lobby';
  index = -1;
  questionStartedAt = 0;
  questionEndsAt = 0;
  lastActivity = Date.now();

  players = new Map<string, Player>();
  /** questionId -> playerId -> response */
  responses = new Map<string, Map<string, Response>>();
  /** playerId -> rank, captured before the current question was scored */
  previousRanks = new Map<string, number>();

  private timer: NodeJS.Timeout | null = null;
  private onAutoAdvance: (s: Session) => void;

  constructor(code: string, quiz: Quiz, onAutoAdvance: (s: Session) => void) {
    this.code = code;
    this.quiz = structuredClone(quiz);
    this.onAutoAdvance = onAutoAdvance;
  }

  get currentQuestion(): Question | null {
    return this.quiz.questions[this.index] ?? null;
  }

  get isLastQuestion(): boolean {
    return this.index >= this.quiz.questions.length - 1;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  // ---------- players ----------

  addPlayer(name: string, existingId?: string): Player {
    if (existingId) {
      const found = this.players.get(existingId);
      if (found) {
        found.connected = true;
        found.name = name || found.name;
        this.touch();
        return found;
      }
    }
    const player: Player = {
      id: nanoid(12),
      name,
      score: 0,
      streak: 0,
      bestStreak: 0,
      connected: true,
      joinedAt: Date.now(),
    };
    this.players.set(player.id, player);
    this.touch();
    return player;
  }

  removePlayer(id: string) {
    this.players.delete(id);
    this.touch();
  }

  nameTaken(name: string, exceptId?: string): boolean {
    const norm = name.trim().toLowerCase();
    for (const p of this.players.values()) {
      if (p.id !== exceptId && p.name.trim().toLowerCase() === norm) return true;
    }
    return false;
  }

  // ---------- flow ----------

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Begin the countdown that precedes the next question. */
  startNextQuestion() {
    this.clearTimer();
    if (this.index >= this.quiz.questions.length - 1) {
      this.showPodium();
      return;
    }
    this.index += 1;
    this.phase = 'countdown';
    this.previousRanks = new Map(
      this.leaderboard().map((row) => [row.id, row.rank]),
    );
    this.questionEndsAt = Date.now() + COUNTDOWN_MS;
    this.touch();
    this.timer = setTimeout(() => this.openQuestion(), COUNTDOWN_MS);
  }

  private openQuestion() {
    const q = this.currentQuestion;
    if (!q) return;
    this.clearTimer();
    this.phase = 'question';
    this.questionStartedAt = Date.now();
    this.questionEndsAt = this.questionStartedAt + q.timeLimit * 1000;
    this.responses.set(q.id, new Map());
    this.touch();
    this.timer = setTimeout(
      () => this.closeQuestion(),
      q.timeLimit * 1000 + LOCK_GRACE_MS,
    );
    this.onAutoAdvance(this);
  }

  /** Stop accepting answers and move to the results view. */
  closeQuestion() {
    if (this.phase !== 'question') return;
    this.clearTimer();
    this.scoreCurrentQuestion();
    this.phase = 'results';
    this.touch();
    this.onAutoAdvance(this);
  }

  showLeaderboard() {
    this.clearTimer();
    this.phase = 'leaderboard';
    this.touch();
  }

  showPodium() {
    this.clearTimer();
    this.phase = 'podium';
    this.touch();
  }

  /** Host pressed "next": results -> leaderboard -> next question / podium. */
  advance() {
    switch (this.phase) {
      case 'lobby':
        this.startNextQuestion();
        break;
      case 'countdown':
        this.openQuestion();
        break;
      case 'question':
        this.closeQuestion();
        break;
      case 'results':
        this.showLeaderboard();
        break;
      case 'leaderboard':
        if (this.isLastQuestion) this.showPodium();
        else this.startNextQuestion();
        break;
      case 'podium':
        break;
    }
  }

  canGoBack(): boolean {
    return this.phase === 'leaderboard' || this.phase === 'podium';
  }

  back() {
    if (this.phase === 'podium') {
      this.phase = 'leaderboard';
    } else if (this.phase === 'leaderboard') {
      this.phase = 'results';
    }
    this.touch();
  }

  // ---------- answering ----------

  submitAnswer(playerId: string, optionId: string): 'ok' | 'closed' | 'duplicate' | 'invalid' {
    const q = this.currentQuestion;
    if (!q || this.phase !== 'question') return 'closed';
    if (Date.now() > this.questionEndsAt + LOCK_GRACE_MS) return 'closed';
    if (!q.options.some((o) => o.id === optionId)) return 'invalid';
    const bucket = this.responses.get(q.id);
    const player = this.players.get(playerId);
    if (!bucket || !player) return 'invalid';
    if (bucket.has(playerId)) return 'duplicate';

    const elapsedMs = Math.max(0, Date.now() - this.questionStartedAt);
    const correct = !!q.options.find((o) => o.id === optionId)?.correct;
    bucket.set(playerId, { optionId, elapsedMs, correct, points: 0 });
    this.touch();

    // Everyone in has answered -> close early so the room isn't left waiting.
    const active = [...this.players.values()].filter((p) => p.connected);
    if (active.length > 0 && active.every((p) => bucket.has(p.id))) {
      setTimeout(() => this.closeQuestion(), 400);
    }
    return 'ok';
  }

  private scoreCurrentQuestion() {
    const q = this.currentQuestion;
    if (!q) return;
    const bucket = this.responses.get(q.id);
    if (!bucket) return;
    for (const player of this.players.values()) {
      const res = bucket.get(player.id);
      if (res && res.correct) {
        res.points = pointsFor(q, res.elapsedMs, player.streak);
        player.score += res.points;
        player.streak += 1;
        player.bestStreak = Math.max(player.bestStreak, player.streak);
      } else {
        player.streak = 0;
      }
    }
  }

  answeredCount(): number {
    const q = this.currentQuestion;
    if (!q) return 0;
    return this.responses.get(q.id)?.size ?? 0;
  }

  /** Tally per option for the current question. */
  tally(): { optionId: string; count: number }[] {
    const q = this.currentQuestion;
    if (!q) return [];
    const bucket = this.responses.get(q.id);
    return q.options.map((o) => ({
      optionId: o.id,
      count: bucket
        ? [...bucket.values()].filter((r) => r.optionId === o.id).length
        : 0,
    }));
  }

  leaderboard(): LeaderRow[] {
    const q = this.currentQuestion;
    const bucket = q ? this.responses.get(q.id) : undefined;
    const rows = [...this.players.values()]
      .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
      .map((p, i) => {
        const prev = this.previousRanks.get(p.id);
        return {
          id: p.id,
          name: p.name,
          score: p.score,
          rank: i + 1,
          gained: bucket?.get(p.id)?.points ?? 0,
          delta: prev === undefined ? 0 : prev - (i + 1),
          streak: p.streak,
        };
      });
    return rows;
  }

  stats() {
    const total = this.quiz.questions.length;
    let totalCorrect = 0;
    let totalAnswers = 0;
    for (const q of this.quiz.questions) {
      const bucket = this.responses.get(q.id);
      if (!bucket) continue;
      for (const r of bucket.values()) {
        totalAnswers += 1;
        if (r.correct) totalCorrect += 1;
      }
    }
    return {
      questions: total,
      players: this.players.size,
      accuracy: totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
    };
  }

  dispose() {
    this.clearTimer();
  }
}
