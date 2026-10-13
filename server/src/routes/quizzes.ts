import { Router } from 'express';
import { nanoid } from 'nanoid';
import { quizStore, blankQuestion } from '../store/quizStore.js';
import type { Question, Quiz } from '../types.js';
import { isQuizReady, quizProblems } from '../quizValidation.js';

export const quizRouter = Router();

/** Re-id and clamp anything coming off the wire before it reaches the store. */
function sanitizeQuestions(input: unknown): Question[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw: Partial<Question>) => {
    const options = (Array.isArray(raw.options) ? raw.options : []).map((o) => ({
      id: o?.id || nanoid(8),
      text: String(o?.text ?? '').slice(0, 200),
      correct: !!o?.correct,
    }));
    return {
      id: raw.id || nanoid(10),
      type: raw.type === 'true-false' ? 'true-false' : 'multiple-choice',
      text: String(raw.text ?? '').slice(0, 300),
      timeLimit: Math.min(120, Math.max(5, Number(raw.timeLimit) || 20)),
      points:
        raw.points === 'double' || raw.points === 'none' ? raw.points : 'standard',
      options: options.length ? options : blankQuestion().options,
    };
  });
}

quizRouter.get('/', (_req, res) => {
  res.json(
    quizStore.all().map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      emoji: q.emoji,
      questionCount: q.questions.length,
      updatedAt: q.updatedAt,
      ready: isQuizReady(q),
      problems: quizProblems(q),
    })),
  );
});

quizRouter.get('/:id', (req, res) => {
  const quiz = quizStore.get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

quizRouter.post('/', (req, res) => {
  const body = req.body as Partial<Quiz>;
  const quiz = quizStore.create({
    title: body.title,
    description: body.description,
    emoji: body.emoji,
    questions: body.questions ? sanitizeQuestions(body.questions) : undefined,
  });
  res.status(201).json(quiz);
});

quizRouter.put('/:id', (req, res) => {
  const body = req.body as Partial<Quiz>;
  const quiz = quizStore.update(req.params.id, {
    title: String(body.title ?? '').slice(0, 120) || 'Untitled quiz',
    description: String(body.description ?? '').slice(0, 300),
    emoji: body.emoji || '✨',
    questions: sanitizeQuestions(body.questions),
  });
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

quizRouter.post('/:id/duplicate', (req, res) => {
  const quiz = quizStore.duplicate(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.status(201).json(quiz);
});

quizRouter.delete('/:id', (req, res) => {
  if (!quizStore.remove(req.params.id))
    return res.status(404).json({ error: 'Quiz not found' });
  res.status(204).end();
});
