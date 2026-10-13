import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Banner, EmptyState, PageLoader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import type { QuizSummary } from '../lib/types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api
      .listQuizzes()
      .then(setQuizzes)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function createQuiz() {
    setBusy('new');
    try {
      const quiz = await api.createQuiz({ title: 'Untitled quiz', emoji: '✨' });
      navigate(`/edit/${quiz.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the quiz');
      setBusy(null);
    }
  }

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo />
          <Link to="/play" className="btn-ghost btn-md">
            Join as player
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Your quizzes
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              Build it here, then present it to the room.
            </p>
          </div>
          <button className="btn-primary btn-lg" onClick={createQuiz} disabled={busy === 'new'}>
            {busy === 'new' ? <Spinner className="h-4 w-4" /> : '+'} New quiz
          </button>
        </div>

        {error && <div className="mt-5"><Banner>{error}</Banner></div>}

        <div className="mt-7">
          {quizzes === null ? (
            <PageLoader label="Loading your quizzes" />
          ) : quizzes.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="No quizzes yet"
              body="Create your first quiz, add a few questions, and you're ready to present."
              action={
                <button className="btn-primary btn-md" onClick={createQuiz}>
                  Create a quiz
                </button>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz, i) => (
                <li
                  key={quiz.id}
                  className="card group flex animate-fade-up flex-col p-5 transition-shadow hover:shadow-lift"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sunken text-xl" aria-hidden="true">
                      {quiz.emoji}
                    </span>
                    <span
                      className={`chip ${quiz.ready ? '' : 'bg-amber/10 text-amber'}`}
                      title={quiz.ready ? 'Ready to present' : quiz.problems.join(' ')}
                    >
                      {quiz.ready ? '' : '⚠ '}
                      {quiz.questionCount} Q
                    </span>
                  </div>

                  <Link
                    to={`/edit/${quiz.id}`}
                    className="mt-3.5 font-display text-base font-extrabold leading-snug text-ink hover:text-brand-600"
                  >
                    {quiz.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 min-h-[2.2em] text-[13px] leading-snug text-ink-mute">
                    {quiz.description || 'No description'}
                  </p>
                  <p className="mt-2 text-xs text-ink-mute">Edited {timeAgo(quiz.updatedAt)}</p>

                  <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                    <Link
                      to={`/present/${quiz.id}`}
                      className={`btn-primary btn-sm flex-1 ${
                        quiz.ready ? '' : 'pointer-events-none opacity-40'
                      }`}
                      aria-disabled={!quiz.ready}
                      title={quiz.ready ? 'Present this quiz' : quiz.problems.join(' ')}
                    >
                      ▶ Present
                    </Link>
                    <Link to={`/edit/${quiz.id}`} className="btn-outline btn-sm">
                      Edit
                    </Link>
                    <details className="relative">
                      <summary className="btn-ghost btn-sm cursor-pointer list-none" aria-label="More actions">
                        ⋯
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift">
                        <button
                          className="w-full px-3.5 py-2 text-left text-sm font-medium text-ink hover:bg-sunken"
                          disabled={busy === quiz.id}
                          onClick={() => act(quiz.id, () => api.duplicateQuiz(quiz.id))}
                        >
                          Duplicate
                        </button>
                        <button
                          className="w-full px-3.5 py-2 text-left text-sm font-medium text-wrong hover:bg-wrong/10"
                          disabled={busy === quiz.id}
                          onClick={() => {
                            if (confirm(`Delete “${quiz.title}”? This cannot be undone.`))
                              act(quiz.id, () => api.deleteQuiz(quiz.id));
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
