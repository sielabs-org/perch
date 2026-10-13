import type { Session } from './session.js';

/**
 * The host sees everything: correct answers, live tallies, the full roster.
 * Players only ever receive what is safe for them to hold at that moment —
 * option text without the `correct` flag while a question is open.
 */
export function hostView(session: Session) {
  const q = session.currentQuestion;
  const leaderboard = session.leaderboard();
  const showAnswers = session.phase === 'results' || session.phase === 'leaderboard';

  return {
    role: 'host' as const,
    code: session.code,
    phase: session.phase,
    quiz: { id: session.quiz.id, title: session.quiz.title, emoji: session.quiz.emoji },
    index: session.index,
    total: session.quiz.questions.length,
    endsAt: session.questionEndsAt,
    serverNow: Date.now(),
    question: q
      ? {
          id: q.id,
          text: q.text,
          type: q.type,
          timeLimit: q.timeLimit,
          points: q.points,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            correct: o.correct,
          })),
        }
      : null,
    answeredCount: session.answeredCount(),
    playerCount: session.players.size,
    players: [...session.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
    tally: showAnswers ? session.tally() : null,
    leaderboard,
    stats: session.stats(),
  };
}

export function playerView(session: Session, playerId: string) {
  const q = session.currentQuestion;
  const me = session.players.get(playerId);
  const leaderboard = session.leaderboard();
  const myRow = leaderboard.find((r) => r.id === playerId);
  const bucket = q ? session.responses.get(q.id) : undefined;
  const myResponse = bucket?.get(playerId);
  const revealed = session.phase === 'results' || session.phase === 'leaderboard';

  return {
    role: 'player' as const,
    code: session.code,
    phase: session.phase,
    quiz: { title: session.quiz.title, emoji: session.quiz.emoji },
    index: session.index,
    total: session.quiz.questions.length,
    endsAt: session.questionEndsAt,
    serverNow: Date.now(),
    question: q
      ? {
          id: q.id,
          text: revealed ? q.text : '',
          type: q.type,
          timeLimit: q.timeLimit,
          points: q.points,
          // Text is withheld on the player's device on purpose: the question
          // lives on the shared screen, the phone is just the buzzer.
          options: q.options.map((o, i) => ({
            id: o.id,
            index: i,
            text: revealed ? o.text : '',
            correct: revealed ? o.correct : undefined,
          })),
        }
      : null,
    me: me
      ? {
          id: me.id,
          name: me.name,
          score: me.score,
          streak: me.streak,
          rank: myRow?.rank ?? 0,
          gained: myRow?.gained ?? 0,
          delta: myRow?.delta ?? 0,
        }
      : null,
    myAnswer: myResponse
      ? {
          optionId: myResponse.optionId,
          correct: revealed ? myResponse.correct : undefined,
          points: revealed ? myResponse.points : undefined,
        }
      : null,
    playerCount: session.players.size,
    answeredCount: session.answeredCount(),
    podium: session.phase === 'podium' ? leaderboard.slice(0, 3) : null,
    nearby:
      session.phase === 'leaderboard' || session.phase === 'podium'
        ? leaderboard.slice(0, 5)
        : null,
  };
}
