import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { JoinPanel } from '../components/JoinPanel';
import { OptionShape } from '../components/OptionShape';
import { ResultsChart, type ResultBar } from '../components/ResultsChart';
import { Leaderboard } from '../components/Leaderboard';
import { Podium } from '../components/Podium';
import { TimerRing } from '../components/TimerRing';
import { Banner, PageLoader } from '../components/ui';
import { emit, getSocket } from '../lib/socket';
import { useCountdown } from '../lib/hooks';
import { optionColor } from '../lib/palette';
import type { HostState } from '../lib/types';

export default function Present() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<HostState | null>(null);
  const [error, setError] = useState('');
  const codeRef = useRef<string>('');
  const bootRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const socket = getSocket();

    // Opening a room must happen exactly once per mount, even though React
    // runs effects twice in development and `connect` can fire again after a
    // dropped network. Without the in-flight guard the host ends up owning two
    // rooms: the control bar drives one while the players sit in the other.
    const boot = async () => {
      // Reuse the room across a reload so a flaky projector doesn't scatter
      // the players already waiting in the lobby.
      const saved = codeRef.current || sessionStorage.getItem(`host-room:${id}`);
      if (saved) {
        try {
          const res = await emit<{ code: string; state: HostState }>('host:resume', { code: saved });
          codeRef.current = res.code;
          setState(res.state);
          return;
        } catch {
          sessionStorage.removeItem(`host-room:${id}`);
          codeRef.current = '';
        }
      }
      const res = await emit<{ code: string; state: HostState }>('host:create', { quizId: id });
      codeRef.current = res.code;
      sessionStorage.setItem(`host-room:${id}`, res.code);
      setState(res.state);
    };

    const open = () => {
      if (bootRef.current) return bootRef.current;
      const run = boot()
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : 'Could not open the room'),
        )
        .finally(() => {
          bootRef.current = null;
        });
      bootRef.current = run;
      return run;
    };

    const onState = (s: HostState) => setState(s);
    socket.on('session:state', onState);
    socket.on('connect', open);
    if (socket.connected) open();

    return () => {
      socket.off('session:state', onState);
      socket.off('connect', open);
    };
  }, [id]);

  // Space / → advances, ← steps back. Hosts drive from a clicker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        emit('host:next').catch(() => {});
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        emit('host:back').catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <Banner>{error}</Banner>
        <Link to="/dashboard" className="btn-outline btn-md mt-4">← Back to dashboard</Link>
      </div>
    );
  }
  if (!state) return <PageLoader label="Opening the room" />;

  const next = () => emit('host:next').catch((e) => setError(e.message));
  const back = () => emit('host:back').catch(() => {});

  const endSession = async () => {
    if (!confirm('End this session for everyone?')) return;
    await emit('host:end').catch(() => {});
    sessionStorage.removeItem(`host-room:${id}`);
    navigate('/dashboard');
  };

  const nextLabel = {
    lobby: state.playerCount ? `Start quiz · ${state.playerCount} in` : 'Start quiz',
    countdown: 'Skip countdown',
    question: 'Lock answers',
    results: 'Show leaderboard',
    leaderboard: state.index >= state.total - 1 ? 'Show final results' : 'Next question',
    podium: 'Finished',
  }[state.phase];

  return (
    <div className="flex min-h-full flex-col bg-page">
      {/* ---------- control bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-5 py-3">
          <Logo compact to="/dashboard" />
          <div>
            <p className="font-display text-sm font-extrabold leading-tight text-ink">
              {state.quiz.emoji} {state.quiz.title}
            </p>
            <p className="text-xs text-ink-mute">
              {state.index >= 0 ? `Question ${state.index + 1} of ${state.total}` : 'Waiting room'}
              {' · '}
              {state.playerCount} {state.playerCount === 1 ? 'player' : 'players'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {state.phase !== 'lobby' && <JoinPanel code={state.code} compact />}
            <button className="btn-ghost btn-sm" onClick={back} title="Previous step (←)">←</button>
            <button
              className="btn-primary btn-md"
              onClick={next}
              disabled={state.phase === 'podium'}
              title="Next step (Space)"
            >
              {nextLabel} →
            </button>
            <button className="btn-danger btn-sm" onClick={endSession}>End</button>
          </div>
        </div>

        <div className="h-1 w-full bg-sunken" aria-hidden="true">
          <div
            className="h-full bg-brand-500 transition-[width] duration-500"
            style={{ width: `${state.total ? ((state.index + 1) / state.total) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col justify-center px-5 py-8">
        {state.phase === 'lobby' && <Lobby state={state} onStart={next} />}
        {state.phase === 'countdown' && <Countdown state={state} />}
        {(state.phase === 'question' || state.phase === 'results') && (
          <QuestionStage state={state} />
        )}
        {state.phase === 'leaderboard' && <LeaderboardStage state={state} />}
        {state.phase === 'podium' && <PodiumStage state={state} />}
      </main>
    </div>
  );
}

/* ------------------------------- stages ------------------------------- */

function Lobby({ state, onStart }: { state: HostState; onStart: () => void }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <section className="animate-fade-up">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {state.quiz.emoji} {state.quiz.title}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          {state.total} {state.total === 1 ? 'question' : 'questions'} · join from any phone
        </p>

        <div className="mt-7">
          <JoinPanel code={state.code} />
        </div>

        <button
          className="btn-primary btn-lg mt-7 w-full sm:w-auto"
          onClick={onStart}
          disabled={state.playerCount === 0}
        >
          {state.playerCount === 0
            ? 'Waiting for the first player…'
            : `Start quiz with ${state.playerCount} ${state.playerCount === 1 ? 'player' : 'players'}`}
        </button>
        <p className="mt-2 text-xs text-ink-mute">
          Tip: press <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> to advance at any point.
        </p>
      </section>

      <section className="card flex flex-col p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold text-ink">In the room</h2>
          <span className="font-display text-3xl font-extrabold tabular-nums text-brand-500">
            {state.playerCount}
          </span>
        </div>

        {state.players.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-14 text-center">
            <span className="animate-float text-4xl" aria-hidden="true">👀</span>
            <p className="text-sm font-medium text-ink-soft">Nobody has joined yet.</p>
            <p className="max-w-[22ch] text-xs text-ink-mute">
              Names appear here the moment someone enters the code.
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2 overflow-y-auto">
            {state.players.map((p) => (
              <li
                key={p.id}
                className="group flex animate-pop-in items-center gap-1.5 rounded-full border border-line bg-sunken/60 py-1.5 pl-3 pr-2 text-sm font-semibold text-ink"
              >
                {p.name}
                <button
                  onClick={() => emit('host:kick', { playerId: p.id }).catch(() => {})}
                  className="grid h-4 w-4 place-items-center rounded-full text-ink-mute opacity-0 transition-opacity hover:bg-wrong hover:text-white focus:opacity-100 group-hover:opacity-100"
                  aria-label={`Remove ${p.name}`}
                  title={`Remove ${p.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Countdown({ state }: { state: HostState }) {
  const { seconds } = useCountdown(state.endsAt, state.serverNow);
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div>
        <p className="label">Question {state.index + 1} of {state.total}</p>
        <p
          key={seconds}
          className="animate-pop-in font-display text-[clamp(5rem,22vw,14rem)] font-extrabold leading-none text-brand-500"
        >
          {seconds > 0 ? seconds : 'Go!'}
        </p>
        <p className="mt-4 text-lg font-medium text-ink-soft">Phones up — get ready.</p>
      </div>
    </div>
  );
}

function QuestionStage({ state }: { state: HostState }) {
  const { seconds } = useCountdown(state.endsAt, state.serverNow);
  const q = state.question;
  if (!q) return null;

  const revealed = state.phase === 'results';
  const tallyMap = new Map((state.tally ?? []).map((t) => [t.optionId, t.count]));
  const totalAnswers = (state.tally ?? []).reduce((a, t) => a + t.count, 0);

  const bars: ResultBar[] = q.options.map((o) => ({
    optionId: o.id,
    text: o.text,
    correct: o.correct,
    count: tallyMap.get(o.id) ?? 0,
  }));

  return (
    <div className="grid gap-7 lg:grid-cols-[1.35fr_.65fr]">
      <section>
        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            <p className="label">Question {state.index + 1} of {state.total}</p>
            <h1 className="mt-2 font-display text-[clamp(1.6rem,3.6vw,3rem)] font-extrabold leading-[1.12] tracking-tight text-ink">
              {q.text}
            </h1>
          </div>
          {!revealed && <TimerRing seconds={seconds} total={q.timeLimit} size={88} />}
        </div>

        {revealed ? (
          <div className="card mt-7 p-5 sm:p-7">
            <h2 className="label mb-5">How the room answered</h2>
            <ResultsChart bars={bars} totalAnswers={totalAnswers} />
            <p className="mt-5 rounded-xl bg-correct/10 px-4 py-3 text-sm font-semibold text-ink">
              <span className="text-correct">✓ Correct answer:</span>{' '}
              {q.options.find((o) => o.correct)?.text}
            </p>
          </div>
        ) : (
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const color = optionColor(i);
              return (
                <li
                  key={o.id}
                  className="flex animate-fade-up items-center gap-4 rounded-2xl px-5 py-6 text-white shadow-tile"
                  style={{ background: color.hex, animationDelay: `${i * 70}ms` }}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20">
                    <OptionShape shape={color.shape} size={22} />
                  </span>
                  <span className="font-display text-xl font-bold leading-snug sm:text-2xl">
                    {o.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        <div className="card p-5 text-center">
          <p className="label">Answers in</p>
          <p className="mt-1 font-display text-5xl font-extrabold tabular-nums text-ink">
            {state.answeredCount}
            <span className="text-2xl text-ink-mute">/{state.playerCount}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
              style={{
                width: `${state.playerCount ? (state.answeredCount / state.playerCount) * 100 : 0}%`,
              }}
            />
          </div>
          {!revealed && (
            <button className="btn-outline btn-sm mt-4 w-full" onClick={() => emit('host:skip').catch(() => {})}>
              Lock answers now
            </button>
          )}
        </div>

        <div className="card flex-1 p-5">
          <h2 className="label mb-3">Standings</h2>
          <Leaderboard rows={state.leaderboard} limit={8} showGain={revealed} />
        </div>
      </aside>
    </div>
  );
}

function LeaderboardStage({ state }: { state: HostState }) {
  const last = state.index >= state.total - 1;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="label">After question {state.index + 1} of {state.total}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          🏆 Leaderboard
        </h1>
        <p className="mt-2 text-ink-soft">
          {last ? 'Final question done — results are next.' : 'Still anyone’s game.'}
        </p>
      </div>
      <div className="card mt-7 p-5 sm:p-7">
        <Leaderboard rows={state.leaderboard} limit={10} />
      </div>
    </div>
  );
}

function PodiumStage({ state }: { state: HostState }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="label">{state.quiz.title}</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
        🎉 That’s a wrap!
      </h1>

      <div className="mt-10">
        <Podium rows={state.leaderboard} />
      </div>

      <dl className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4">
        {[
          [state.stats.players, 'players'],
          [state.stats.questions, 'questions'],
          [`${state.stats.accuracy}%`, 'answered correctly'],
        ].map(([big, small]) => (
          <div key={small as string} className="card p-4">
            <dt className="font-display text-2xl font-extrabold tabular-nums text-ink">{big}</dt>
            <dd className="mt-0.5 text-xs text-ink-mute">{small}</dd>
          </div>
        ))}
      </dl>

      {state.leaderboard.length > 3 && (
        <div className="card mx-auto mt-8 max-w-xl p-5 text-left">
          <h2 className="label mb-3">Full standings</h2>
          <Leaderboard rows={state.leaderboard} limit={20} showGain={false} />
        </div>
      )}

      <Link to="/dashboard" className="btn-outline btn-lg mt-8">
        Back to dashboard
      </Link>
    </div>
  );
}
