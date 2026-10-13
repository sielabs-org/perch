import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import type { Quiz, Question } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'quizzes.json');

let quizzes: Quiz[] = [];

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(quizzes, null, 2));
}

export function blankQuestion(index = 0): Question {
  return {
    id: nanoid(10),
    type: 'multiple-choice',
    text: '',
    timeLimit: 20,
    points: 'standard',
    options: [
      { id: nanoid(8), text: '', correct: index === -1 },
      { id: nanoid(8), text: '', correct: false },
      { id: nanoid(8), text: '', correct: false },
      { id: nanoid(8), text: '', correct: false },
    ],
  };
}

function seedQuiz(): Quiz {
  const now = new Date().toISOString();
  const mk = (
    text: string,
    timeLimit: number,
    opts: [string, boolean][],
  ): Question => ({
    id: nanoid(10),
    type: 'multiple-choice',
    text,
    timeLimit,
    points: 'standard',
    options: opts.map(([t, c]) => ({ id: nanoid(8), text: t, correct: c })),
  });

  return {
    id: nanoid(10),
    title: 'Team Warm-Up: General Knowledge',
    description: 'A five-question icebreaker to test the room.',
    emoji: '🧠',
    createdAt: now,
    updatedAt: now,
    questions: [
      mk('Which planet in our solar system has the most moons?', 20, [
        ['Jupiter', false],
        ['Saturn', true],
        ['Neptune', false],
        ['Uranus', false],
      ]),
      mk('What does "HTTP" stand for?', 20, [
        ['HyperText Transfer Protocol', true],
        ['High Transfer Text Protocol', false],
        ['Hyperlink Transmission Process', false],
        ['Host Terminal Transfer Port', false],
      ]),
      mk('In which city is Mentimeter headquartered?', 15, [
        ['Oslo', false],
        ['Copenhagen', false],
        ['Stockholm', true],
        ['Helsinki', false],
      ]),
      mk('Roughly how many bones are in an adult human body?', 20, [
        ['106', false],
        ['206', true],
        ['306', false],
        ['406', false],
      ]),
      mk('Which of these languages is dynamically typed?', 25, [
        ['Rust', false],
        ['Go', false],
        ['Python', true],
        ['Java', false],
      ]),
    ],
  };
}

export function loadQuizzes() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      quizzes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch {
    quizzes = [];
  }
  if (quizzes.length === 0) {
    quizzes = [seedQuiz()];
    persist();
  }
}

export const quizStore = {
  all(): Quiz[] {
    return [...quizzes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  get(id: string): Quiz | undefined {
    return quizzes.find((q) => q.id === id);
  },
  create(partial: Partial<Quiz>): Quiz {
    const now = new Date().toISOString();
    const quiz: Quiz = {
      id: nanoid(10),
      title: partial.title?.trim() || 'Untitled quiz',
      description: partial.description ?? '',
      emoji: partial.emoji || '✨',
      createdAt: now,
      updatedAt: now,
      questions: partial.questions?.length ? partial.questions : [blankQuestion()],
    };
    quizzes.push(quiz);
    persist();
    return quiz;
  },
  update(id: string, patch: Partial<Quiz>): Quiz | undefined {
    const quiz = quizzes.find((q) => q.id === id);
    if (!quiz) return undefined;
    Object.assign(quiz, patch, {
      id: quiz.id,
      createdAt: quiz.createdAt,
      updatedAt: new Date().toISOString(),
    });
    persist();
    return quiz;
  },
  remove(id: string): boolean {
    const i = quizzes.findIndex((q) => q.id === id);
    if (i === -1) return false;
    quizzes.splice(i, 1);
    persist();
    return true;
  },
  duplicate(id: string): Quiz | undefined {
    const src = quizzes.find((q) => q.id === id);
    if (!src) return undefined;
    return quizStore.create({
      ...structuredClone(src),
      title: `${src.title} (copy)`,
      questions: structuredClone(src.questions).map((q) => ({
        ...q,
        id: nanoid(10),
        options: q.options.map((o) => ({ ...o, id: nanoid(8) })),
      })),
    });
  },
};
