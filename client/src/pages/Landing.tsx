import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';
import { api } from '../lib/api';
import { OPTION_COLORS } from '../lib/palette';

export default function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) return setError('A join code is 6 digits.');
    setChecking(true);
    setError('');
    try {
      await api.lookupSession(clean);
      navigate(`/play?code=${clean}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that room.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/dashboard" className="btn-outline btn-md">
          Host dashboard
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <section className="animate-fade-up">
          <span className="chip bg-brand-50 text-brand-700">Live quizzes · no app, no sign-up</span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[56px]">
            Turn any room into a
            <span className="text-brand-500"> live quiz</span>.
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-soft">
            Build a quiz, put it on the big screen, and let everyone answer from their
            phone. Scores are timed, results appear instantly, and a leaderboard runs
            after every single question.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="btn-primary btn-lg">
              Create a quiz
            </Link>
            <a href="#join" className="btn-outline btn-lg">
              I have a code
            </a>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ['Unlimited', 'players per room'],
              ['Per question', 'live leaderboard'],
              ['Speed-based', 'scoring + streaks'],
            ].map(([big, small]) => (
              <div key={small}>
                <dt className="font-display text-base font-extrabold text-ink">{big}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-ink-mute">{small}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="join" className="animate-fade-up [animation-delay:120ms]">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-sunken/50 px-5 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                {OPTION_COLORS.map((c) => (
                  <span key={c.key} className="h-2.5 w-2.5 rounded-full" style={{ background: c.hex }} />
                ))}
              </span>
              <p className="text-xs font-semibold text-ink-soft">Join a live quiz</p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4 p-6 sm:p-8">
              <label htmlFor="code" className="label">
                6-digit join code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="123456"
                value={code}
                maxLength={6}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className="field h-20 text-center font-mono text-4xl font-bold tracking-[.22em]"
                aria-describedby={error ? 'code-error' : undefined}
              />
              {error && (
                <div id="code-error">
                  <Banner>{error}</Banner>
                </div>
              )}
              <button type="submit" className="btn-primary btn-lg w-full" disabled={checking}>
                {checking ? 'Finding room…' : 'Enter room'}
              </button>
              <p className="text-center text-xs text-ink-mute">
                The host shows the code on the presentation screen.
              </p>
            </form>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['⚡', 'Answer fast', 'Quicker answers score more.'],
              ['📊', 'Instant results', 'Every answer charted live.'],
              ['🏆', 'Leaderboard', 'Standings after each round.'],
            ].map(([icon, title, body]) => (
              <li key={title} className="card p-4">
                <span className="text-lg" aria-hidden="true">{icon}</span>
                <p className="mt-1.5 text-sm font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-mute">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-xs text-ink-mute">
        QuizDeck — live quizzing for classrooms, standups and conferences.
      </footer>
    </div>
  );
}
