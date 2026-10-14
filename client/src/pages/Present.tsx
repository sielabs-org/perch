import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { JoinPanel } from '../components/JoinPanel';
import { OptionShape } from '../components/OptionShape';
import { ResultsChart, type ResultBar } from '../components/ResultsChart';
import { Leaderboard } from '../components/Leaderboard';
import { CelebrationFinale } from '../components/CelebrationFinale';
import { TimerRing } from '../components/TimerRing';
import { Banner, PageLoader } from '../components/ui';
import { emit, getSocket } from '../lib/socket';
import { useCountdown } from '../lib/hooks';
import { optionColor } from '../lib/palette';
import { getPlayerEmoji } from '../lib/avatar';
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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] items-start">
      {/* Center: Main Waiting Room Stage */}
      <section className="flex flex-col gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-lg font-bold text-ink sm:text-xl">
            <span className="mr-1.5 inline-block text-xl">{state.quiz.emoji}</span>
            {state.quiz.title}
          </h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            {state.total} {state.total === 1 ? 'question' : 'questions'} · join from any phone
          </p>
        </div>

        {/* Floating Player Stage Arena */}
        <div className="card relative flex flex-col p-6 sm:p-7 min-h-[380px] lg:min-h-[440px] bg-gradient-to-b from-surface via-surface to-page/50 border border-line overflow-hidden shadow-card">
          {/* Header of Stage */}
          <div className="flex items-center justify-between border-b border-line/70 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                In the room
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Players ready</span>
              <span className="font-display text-3xl font-black tabular-nums text-brand-500">
                {state.playerCount}
              </span>
            </div>
          </div>

          {/* Floating Players Area */}
          {state.players.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="animate-float text-5xl select-none" aria-hidden="true">🎉</span>
              <h3 className="font-display text-lg font-bold text-ink">Waiting for players to join…</h3>
              <p className="max-w-[30ch] text-xs sm:text-sm text-ink-mute leading-relaxed">
                Scan the QR code or enter the code on the right from your phone.
              </p>
            </div>
          ) : (
            <div className="relative flex-1 py-6 flex flex-wrap content-start items-center gap-3.5 sm:gap-4 overflow-y-auto no-scrollbar">
              {state.players.map((p, idx) => {
                const emoji = getPlayerEmoji(p.id, p.name);
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={p.id}
                    className={`group relative flex items-center gap-2.5 rounded-2xl border border-line/90 bg-surface/95 px-4 py-2 shadow-sm backdrop-blur-xs transition-transform hover:scale-105 ${
                      isEven ? 'animate-float-gentle' : 'animate-float-reverse'
                    }`}
                    style={{
                      animationDelay: `${(idx * 0.35) % 2}s`,
                    }}
                  >
                    <span className="text-2xl sm:text-3xl select-none filter drop-shadow-xs" aria-hidden="true">
                      {emoji}
                    </span>
                    <span className="font-display text-sm sm:text-base font-bold text-ink">
                      {p.name}
                    </span>
                    <button
                      onClick={() => emit('host:kick', { playerId: p.id }).catch(() => {})}
                      className="ml-1 grid h-5 w-5 place-items-center rounded-full text-ink-mute opacity-0 transition-opacity hover:bg-wrong hover:text-white focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Remove ${p.name}`}
                      title={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start Button & Shortcuts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <button
            className="btn-primary btn-lg px-8 text-base font-bold shadow-md shadow-brand-500/20"
            onClick={onStart}
            disabled={state.playerCount === 0}
          >
            {state.playerCount === 0
              ? 'Waiting for players…'
              : `Start quiz with ${state.playerCount} ${state.playerCount === 1 ? 'player' : 'players'} →`}
          </button>
          <p className="text-xs text-ink-mute">
            Tip: press <kbd className="rounded border border-line bg-sunken px-2 py-0.5 font-mono text-xs font-semibold text-ink">Space</kbd> to advance at any point.
          </p>
        </div>
      </section>

      {/* Right: Scanner & Join Link */}
      <aside className="w-full shrink-0 animate-fade-up [animation-delay:100ms]">
        <JoinPanel code={state.code} vertical />
      </aside>
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
  return <CelebrationFinale state={state} />;
}
