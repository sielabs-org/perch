import type { Question, Quiz } from './types.js';

/**
 * A question is presentable when it has text, at least two real options and
 * exactly one of them marked correct. The editor shows these as warnings; the
 * server enforces them so a half-finished quiz can never reach a live room.
 */
export function questionProblems(q: Question): string[] {
  const problems: string[] = [];
  if (!q.text.trim()) problems.push('the question text is empty');
  const filled = q.options.filter((o) => o.text.trim());
  if (filled.length < 2) problems.push('it needs at least two answer options');
  const correct = filled.filter((o) => o.correct);
  if (correct.length !== 1) problems.push('exactly one option must be marked correct');
  return problems;
}

export function quizProblems(quiz: Quiz): string[] {
  if (!quiz.questions.length) return ['This quiz has no questions yet.'];
  return quiz.questions.flatMap((q, i) => {
    const problems = questionProblems(q);
    return problems.length ? [`Question ${i + 1}: ${problems.join(', ')}.`] : [];
  });
}

export const isQuizReady = (quiz: Quiz) => quizProblems(quiz).length === 0;
