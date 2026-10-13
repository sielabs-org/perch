import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { OptionShape } from '../components/OptionShape';
import { Banner, PageLoader } from '../components/ui';
import { api } from '../lib/api';
import { optionColor } from '../lib/palette';
import type { PointsMode, Question, Quiz } from '../lib/types';

const TIME_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90];
const POINTS_LABEL: Record<PointsMode, string> = {
  standard: 'Standard',
  double: 'Double',
  none: 'No points',
};
const EMOJI_CHOICES = ['✨', '🧠', '🚀', '🎯', '🎲', '📚', '🔬', '🌍', '🍿', '⚽', '🎵', '💡'];

const uid = () => Math.random().toString(36).slice(2, 10);

function newQuestion(): Question {
  return {
    id: uid(),
    type: 'multiple-choice',
    text: '',
    timeLimit: 20,
    points: 'standard',
    options: Array.from({ length: 4 }, () => ({ id: uid(), text: '', correct: false })),
  };
}

function trueFalseQuestion(): Question {
  return {
    id: uid(),
    type: 'true-false',
    text: '',
    timeLimit: 15,
    points: 'standard',
    options: [
      { id: uid(), text: 'True', correct: true },
      { id: uid(), text: 'False', correct: false },
    ],
  };
}

/** Everything that must be true before the quiz can be presented. */
function problemsFor(q: Question): string[] {
  const issues: string[] = [];
  if (!q.text.trim()) issues.push('Question text is empty');
  const filled = q.options.filter((o) => o.text.trim());
  if (filled.length < 2) issues.push('Needs at least 2 answer options');
  if (!q.options.some((o) => o.correct && o.text.trim()))
    issues.push('Mark one option as correct');
  return issues;
}

export default function Editor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const dirtyRef = useRef(false);

  useEffect(() => {
    api
      .getQuiz(id)
      .then((q) => {
        setQuiz(q);
        if (!q.questions.length) {
          setQuiz({ ...q, questions: [newQuestion()] });
          dirtyRef.current = true;
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const save = useCallback(
    async (next: Quiz) => {
      setSaveState('saving');
      try {
        await api.updateQuiz(next.id, next);
        dirtyRef.current = false;
        setSaveState('saved');
        setError('');
      } catch (e) {
        setSaveState('dirty');
        setError(e instanceof Error ? e.message : 'Could not save');
      }
    },
    [],
  );

  // Debounced autosave — the host should never have to think about saving.
  useEffect(() => {
    if (!quiz || !dirtyRef.current) return;
    setSaveState('dirty');
    const t = setTimeout(() => save(quiz), 700);
    return () => clearTimeout(t);
  }, [quiz, save]);

  // Warn on close while an edit is still in flight.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const mutate = (fn: (draft: Quiz) => void) => {
    setQuiz((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      dirtyRef.current = true;
      return next;
    });
  };

  const patchQuestion = (index: number, patch: Partial<Question>) =>
    mutate((d) => {
      d.questions[index] = { ...d.questions[index], ...patch };
    });

  const problems = useMemo(
    () => (quiz ? quiz.questions.map(problemsFor) : []),
    [quiz],
  );
  const readyToPresent =
    !!quiz && quiz.questions.length > 0 && problems.every((p) => p.length === 0);

  if (error && !quiz) return <div className="p-10"><Banner>{error}</Banner></div>;
  if (!quiz) return <PageLoader label="Opening editor" />;

  const q = quiz.questions[active];

  async function presentNow() {
    if (!quiz) return;
    if (dirtyRef.current) await save(quiz);
    navigate(`/present/${quiz.id}`);
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <Logo compact />
          <Link to="/dashboard" className="btn-ghost btn-sm">
            ← All quizzes
          </Link>

          <div className="mx-1 h-6 w-px bg-line" />

          <input
            value={quiz.title}
            onChange={(e) => mutate((d) => { d.title = e.target.value; })}
            placeholder="Quiz title"
            aria-label="Quiz title"
            className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-base font-extrabold text-ink outline-none hover:border-line focus:border-brand-500 focus:bg-surface"
          />

          <span
            className={`text-xs font-semibold ${
              saveState === 'saved' ? 'text-ink-mute' : 'text-amber'
            }`}
            aria-live="polite"
          >
            {saveState === 'saved' ? '✓ Saved' : saveState === 'saving' ? 'Saving…' : 'Unsaved'}
          </span>

          <button
            className="btn-primary btn-md"
            onClick={presentNow}
            disabled={!readyToPresent}
            title={readyToPresent ? 'Open the presentation view' : 'Fix the flagged questions first'}
          >
            ▶ Present
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-5 py-6 lg:grid-cols-[260px_1fr_240px]">
        {/* ---------- slide rail ---------- */}
        <aside className="lg:sticky lg:top-[68px] lg:h-fit">
          <p className="label mb-2.5">Questions ({quiz.questions.length})</p>
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {quiz.questions.map((item, i) => {
              const bad = problems[i].length > 0;
              return (
                <li key={item.id} className="shrink-0 lg:shrink">
                  <button
                    onClick={() => setActive(i)}
                    className={`flex w-48 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors lg:w-full ${
                      i === active
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15'
                        : 'border-line bg-surface hover:border-ink-mute'
                    }`}
                  >
                    <span className="mt-px font-display text-xs font-extrabold tabular-nums text-ink-mute">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-ink">
                        {item.text.trim() || <span className="text-ink-mute">Empty question</span>}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                          {item.type === 'true-false' ? 'T/F' : 'Choice'} · {item.timeLimit}s
                        </span>
                        {bad && (
                          <span className="text-[10px] font-bold text-amber" title={problems[i].join('. ')}>
                            ⚠
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-3 flex gap-2">
            <button
              className="btn-outline btn-sm flex-1"
              onClick={() => {
                mutate((d) => d.questions.push(newQuestion()));
                setActive(quiz.questions.length);
              }}
            >
              + Choice
            </button>
            <button
              className="btn-outline btn-sm flex-1"
              onClick={() => {
                mutate((d) => d.questions.push(trueFalseQuestion()));
                setActive(quiz.questions.length);
              }}
            >
              + True / False
            </button>
          </div>
        </aside>

        {/* ---------- question canvas ---------- */}
        <section className="min-w-0">
          {error && <div className="mb-4"><Banner>{error}</Banner></div>}

          <div className="card p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="label">
                Question {active + 1} of {quiz.questions.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="btn-ghost btn-sm"
                  disabled={active === 0}
                  onClick={() => {
                    mutate((d) => {
                      [d.questions[active - 1], d.questions[active]] = [d.questions[active], d.questions[active - 1]];
                    });
                    setActive(active - 1);
                  }}
                  title="Move up"
                >↑</button>
                <button
                  className="btn-ghost btn-sm"
                  disabled={active >= quiz.questions.length - 1}
                  onClick={() => {
                    mutate((d) => {
                      [d.questions[active + 1], d.questions[active]] = [d.questions[active], d.questions[active + 1]];
                    });
                    setActive(active + 1);
                  }}
                  title="Move down"
                >↓</button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    mutate((d) => {
                      const copy = structuredClone(d.questions[active]);
                      copy.id = uid();
                      copy.options = copy.options.map((o) => ({ ...o, id: uid() }));
                      d.questions.splice(active + 1, 0, copy);
                    });
                    setActive(active + 1);
                  }}
                  title="Duplicate question"
                >⧉</button>
                <button
                  className="btn-danger btn-sm"
                  disabled={quiz.questions.length <= 1}
                  onClick={() => {
                    mutate((d) => d.questions.splice(active, 1));
                    setActive(Math.max(0, active - 1));
                  }}
                  title="Delete question"
                >🗑</button>
              </div>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => patchQuestion(active, { text: e.target.value.slice(0, 300) })}
              placeholder="Type your question…"
              rows={2}
              aria-label="Question text"
              className="field resize-none py-3 font-display text-xl font-bold leading-snug sm:text-2xl"
            />
            <p className="mt-1.5 text-right text-xs text-ink-mute">{q.text.length}/300</p>

            <p className="label mt-6 mb-2.5">Answer options</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const color = optionColor(i);
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2.5 rounded-xl border-2 bg-surface p-2.5 transition-colors ${
                      opt.correct ? 'border-correct' : 'border-line'
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                      style={{ background: color.hex }}
                      aria-hidden="true"
                    >
                      <OptionShape shape={color.shape} size={15} />
                    </span>
                    <input
                      value={opt.text}
                      onChange={(e) =>
                        mutate((d) => {
                          d.questions[active].options[i].text = e.target.value.slice(0, 200);
                        })
                      }
                      placeholder={`Option ${color.letter}`}
                      aria-label={`Option ${color.letter} text`}
                      readOnly={q.type === 'true-false'}
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-mute"
                    />
                    <button
                      onClick={() =>
                        mutate((d) => {
                          // Single correct answer per question keeps scoring unambiguous.
                          d.questions[active].options.forEach((o, j) => { o.correct = j === i; });
                        })
                      }
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-colors ${
                        opt.correct
                          ? 'border-correct bg-correct text-white'
                          : 'border-line text-transparent hover:border-correct/50'
                      }`}
                      aria-pressed={opt.correct}
                      aria-label={`Mark option ${color.letter} as the correct answer`}
                      title="Mark as correct"
                    >
                      ✓
                    </button>
                    {q.type === 'multiple-choice' && q.options.length > 2 && (
                      <button
                        className="shrink-0 px-1 text-ink-mute hover:text-wrong"
                        onClick={() => mutate((d) => d.questions[active].options.splice(i, 1))}
                        aria-label={`Remove option ${color.letter}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {q.type === 'multiple-choice' && q.options.length < 4 && (
              <button
                className="btn-outline btn-sm mt-3"
                onClick={() => mutate((d) => d.questions[active].options.push({ id: uid(), text: '', correct: false }))}
              >
                + Add option
              </button>
            )}

            {problems[active].length > 0 && (
              <ul className="mt-5 flex flex-col gap-1.5 rounded-xl bg-amber/10 px-4 py-3">
                {problems[active].map((p) => (
                  <li key={p} className="text-[13px] font-medium text-ink-soft">
                    <span className="text-amber">⚠</span> {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ---------- settings ---------- */}
        <aside className="lg:sticky lg:top-[68px] lg:h-fit">
          <div className="card p-4">
            <p className="label mb-2">Time limit</p>
            <select
              value={q.timeLimit}
              onChange={(e) => patchQuestion(active, { timeLimit: Number(e.target.value) })}
              className="field h-10"
              aria-label="Time limit in seconds"
            >
              {TIME_CHOICES.map((t) => (
                <option key={t} value={t}>{t} seconds</option>
              ))}
            </select>

            <p className="label mb-2 mt-5">Points</p>
            <div className="flex flex-col gap-1.5">
              {(Object.keys(POINTS_LABEL) as PointsMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => patchQuestion(active, { points: mode })}
                  className={`rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition-colors ${
                    q.points === mode
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-line text-ink-soft hover:border-ink-mute'
                  }`}
                >
                  {POINTS_LABEL[mode]}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs leading-snug text-ink-mute">
              Correct answers score up to 1,000 points, scaled by how fast they came in.
              Streaks add a bonus.
            </p>
          </div>

          <div className="card mt-4 p-4">
            <p className="label mb-2">Quiz details</p>
            <textarea
              value={quiz.description}
              onChange={(e) => mutate((d) => { d.description = e.target.value.slice(0, 300); })}
              placeholder="What is this quiz about?"
              rows={3}
              aria-label="Quiz description"
              className="field resize-none py-2 text-sm"
            />
            <p className="label mb-2 mt-4">Cover icon</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => mutate((d) => { d.emoji = e; })}
                  className={`grid h-8 w-8 place-items-center rounded-lg border text-base transition-colors ${
                    quiz.emoji === e ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-sunken'
                  }`}
                  aria-label={`Use ${e} as the cover icon`}
                  aria-pressed={quiz.emoji === e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {!readyToPresent && (
            <p className="mt-4 rounded-xl bg-amber/10 px-4 py-3 text-xs leading-snug text-ink-soft">
              <span className="font-bold text-amber">⚠ Not ready</span> — every question needs
              text, two options and a marked answer before you can present.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
