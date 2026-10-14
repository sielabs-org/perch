import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { OptionShape } from '../components/OptionShape';
import { Leaderboard, RankBadge } from '../components/Leaderboard';
import { Podium } from '../components/Podium';
import { TimerRing } from '../components/TimerRing';
import { Banner, Spinner } from '../components/ui';
import { emit, getSocket } from '../lib/socket';
import { useAnimatedNumber, useCountdown, useLocalStorage } from '../lib/hooks';
import { optionColor } from '../lib/palette';
import { getPlayerEmoji } from '../lib/avatar';
import type { PlayerState } from '../lib/types';

export default function Play() {
  const [params] = useSearchParams();
  const [state, setState] = useState<PlayerState | null>(null);
  const [identity, setIdentity] = useLocalStorage<{ code: string; playerId: string; name: string } | null>(
    'quizdeck:identity',
    null,
  );
  const [error, setError] = useState('');
  const [ended, setEnded] = useState<string | null>(null);
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: PlayerState) => {
      setState(s);
      setError('');
    };
    const onEnded = () => {
      setEnded('The host ended this session.');
      setState(null);
      setIdentity(null);
    };
    const onKicked = () => {
      setEnded('You were removed from this room.');
      setState(null);
      setIdentity(null);
    };

    // Re-claim the same seat after a refresh or a dropped connection.
    const rejoin = async () => {
      const id = identityRef.current;
      if (!id) return;
      try {
        const res = await emit<{ playerId: string; state: PlayerState }>('player:join', {
          code: id.code,
          name: id.name,
          playerId: id.playerId,
        });
        setState(res.state);
      } catch {
        setIdentity(null);
      }
    };

    socket.on('session:state', onState);
    socket.on('session:ended', onEnded);
    socket.on('session:kicked', onKicked);
    socket.on('connect', rejoin);
    if (socket.connected) rejoin();

    return () => {
      socket.off('session:state', onState);
      socket.off('session:ended', onEnded);
      socket.off('session:kicked', onKicked);
      socket.off('connect', rejoin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ended) {
    return (
      <Shell>
        <div className="card p-7 text-center">
          <span className="text-4xl" aria-hidden="true">👋</span>
          <h1 className="mt-3 font-display text-xl font-extrabold text-ink">{ended}</h1>
          <button className="btn-primary btn-md mt-5" onClick={() => setEnded(null)}>
            Join another quiz
          </button>
        </div>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <JoinForm
          initialCode={params.get('code') ?? ''}
          error={error}
          setError={setError}
          onJoined={(playerId, name, code, next) => {
            setIdentity({ playerId, name, code });
            setState(next);
          }}
        />
      </Shell>
    );
  }

  return <Game state={state} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/dashboard" className="text-xs font-semibold text-ink-mute hover:text-ink">
          Host instead
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10">{children}</main>
    </div>
  );
}

/* ------------------------------ joining ------------------------------ */

function JoinForm({ initialCode, error, setError, onJoined }: {
  initialCode: string;
  error: string;
  setError: (s: string) => void;
  onJoined: (playerId: string, name: string, code: string, state: PlayerState) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    const cleanName = name.trim();
    if (cleanCode.length !== 6) return setError('A join code is 6 digits.');
    if (!cleanName) return setError('Pick a nickname so the room knows you.');

    setBusy(true);
    setError('');
    try {
      const res = await emit<{ playerId: string; state: PlayerState }>('player:join', {
        code: cleanCode,
        name: cleanName,
      });
      onJoined(res.playerId, cleanName, cleanCode, res.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-5 p-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Join the quiz
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Grab the 6-digit code from the big screen.</p>
      </div>

      <div>
        <label htmlFor="join-code" className="label mb-1.5">Join code</label>
        <input
          id="join-code"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={!initialCode}
          value={code}
          maxLength={6}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          placeholder="123456"
          className="field h-16 text-center font-mono text-3xl font-bold tracking-[.2em]"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="label mb-1.5">Your nickname</label>
        <input
          id="nickname"
          value={name}
          maxLength={20}
          autoFocus={!!initialCode}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="e.g. Sam"
          className="field h-12"
        />
        <p className="mt-1.5 text-xs text-ink-mute">Everyone sees this on the leaderboard.</p>
      </div>

      {error && <Banner>{error}</Banner>}

      <button type="submit" className="btn-primary btn-lg w-full" disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : null}
        {busy ? 'Joining…' : 'Join quiz'}
      </button>
    </form>
  );
}

/* ------------------------------- in game ------------------------------- */

function Game({ state }: { state: PlayerState }) {
  const score = useAnimatedNumber(state.me?.score ?? 0);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {state.me && state.me.rank > 0 && <RankBadge rank={state.me.rank} size="sm" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-base select-none">{getPlayerEmoji(state.me?.id || '', state.me?.name || '')}</span>
              <p className="truncate text-sm font-bold leading-tight text-ink">{state.me?.name}</p>
            </div>
            <p className="text-xs text-ink-mute">
              {state.index >= 0 ? `Question ${state.index + 1} of ${state.total}` : 'Waiting room'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-extrabold leading-tight tabular-nums text-ink">
              {score.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">points</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-6">
        {state.phase === 'lobby' && <PlayerLobby state={state} />}
        {state.phase === 'countdown' && <PlayerCountdown state={state} />}
        {state.phase === 'question' && <AnswerPad state={state} />}
        {state.phase === 'results' && <PlayerResult state={state} />}
        {state.phase === 'leaderboard' && <PlayerStandings state={state} />}
        {state.phase === 'podium' && <PlayerFinish state={state} />}
      </main>
    </div>
  );
}

function PlayerLobby({ state }: { state: PlayerState }) {
  const emoji = getPlayerEmoji(state.me?.id || '', state.me?.name || '');
  return (
    <div className="card animate-fade-up p-7 text-center">
      {/* Player avatar badge with assigned emoji */}
      <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2 mb-5 shadow-xs">
        <span className="text-3xl animate-bounce" aria-hidden="true">{emoji}</span>
        <span className="font-display text-base font-bold text-ink">{state.me?.name}</span>
      </div>

      <span className="block animate-float text-4xl" aria-hidden="true">{state.quiz.emoji}</span>
      <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink">
        {state.quiz.title}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        You’re in! Watch the big screen — the quiz starts when the host begins.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-sunken/70 py-3">
        <span className="font-display text-2xl font-extrabold tabular-nums text-brand-500">
          {state.playerCount}
        </span>
        <span className="text-sm font-medium text-ink-soft">
          {state.playerCount === 1 ? 'player waiting' : 'players waiting'}
        </span>
      </div>
      <p className="mt-5 text-xs text-ink-mute">
        Faster answers are worth more — have your thumb ready.
      </p>
    </div>
  );
}

function PlayerCountdown({ state }: { state: PlayerState }) {
  const { seconds } = useCountdown(state.endsAt, state.serverNow);
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <p className="label">Get ready</p>
        <p key={seconds} className="animate-pop-in font-display text-8xl font-extrabold text-brand-500">
          {seconds > 0 ? seconds : 'Go!'}
        </p>
        <p className="mt-3 text-sm text-ink-soft">Look up at the screen for the question.</p>
      </div>
    </div>
  );
}

function AnswerPad({ state }: { state: PlayerState }) {
  const { seconds } = useCountdown(state.endsAt, state.serverNow);
  const [pending, setPending] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const chosen = state.myAnswer?.optionId ?? pending;

  async function pick(optionId: string) {
    if (chosen) return;
    setPending(optionId);
    try {
      await emit('player:answer', { optionId });
      if (navigator.vibrate) navigator.vibrate(18);
    } catch {
      setPending(null);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  if (!state.question) return null;

  if (chosen) {
    const color = optionColor(state.question.options.findIndex((o) => o.id === chosen));
    return (
      <div className="animate-fade-up text-center">
        <div
          className="mx-auto grid h-28 w-28 place-items-center rounded-3xl text-white"
          style={{ background: color.hex }}
        >
          <OptionShape shape={color.shape} size={48} />
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink">Answer locked in</h1>
        <p className="mt-2 text-sm text-ink-soft">
          You picked <strong>{color.letter}</strong>. Points depend on how fast you were.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <TimerRing seconds={seconds} total={state.question.timeLimit} size={64} />
          <p className="text-left text-sm font-medium text-ink-soft">
            {state.answeredCount} of {state.playerCount} answered
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shake ? 'animate-shake' : ''}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="label">Pick your answer</p>
          <p className="mt-0.5 text-xs text-ink-mute">
            The question is on the big screen.
          </p>
        </div>
        <TimerRing seconds={seconds} total={state.question.timeLimit} size={60} />
      </div>

      <div className="grid min-h-[58vh] grid-cols-2 grid-rows-2 gap-3">
        {state.question.options.map((o, i) => {
          const color = optionColor(i);
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              className="flex animate-pop-in flex-col items-center justify-center gap-2 rounded-2xl text-white shadow-tile transition-transform active:scale-95"
              style={{ background: color.hex, animationDelay: `${i * 60}ms` }}
              aria-label={`Answer ${color.letter}`}
            >
              <OptionShape shape={color.shape} size={40} />
              <span className="font-display text-xl font-extrabold">{color.letter}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-xs text-ink-mute">
        {state.answeredCount} of {state.playerCount} have answered
      </p>
    </div>
  );
}

function PlayerResult({ state }: { state: PlayerState }) {
  const answered = !!state.myAnswer;
  const correct = state.myAnswer?.correct === true;
  const gained = state.myAnswer?.points ?? 0;
  const correctOption = state.question?.options.find((o) => o.correct);
  const correctIndex = state.question?.options.findIndex((o) => o.correct) ?? 0;
  const color = optionColor(correctIndex);

  return (
    <div className="animate-fade-up text-center">
      <div
        className={`mx-auto grid h-24 w-24 place-items-center rounded-full text-4xl text-white ${
          correct ? 'bg-correct' : answered ? 'bg-wrong' : 'bg-ink-mute'
        }`}
        aria-hidden="true"
      >
        {correct ? '✓' : answered ? '✕' : '–'}
      </div>

      <h1 className="mt-5 font-display text-3xl font-extrabold text-ink">
        {correct ? 'Correct!' : answered ? 'Not this time' : 'No answer'}
      </h1>

      {correct ? (
        <p className="mt-2 font-display text-xl font-extrabold text-correct">
          +{gained.toLocaleString()} points
        </p>
      ) : (
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sunken px-3.5 py-2">
          <span className="grid h-6 w-6 place-items-center rounded-md text-white" style={{ background: color.hex }}>
            <OptionShape shape={color.shape} size={11} />
          </span>
          <span className="text-sm font-semibold text-ink">
            Answer: {correctOption?.text}
          </span>
        </div>
      )}

      {state.me && state.me.streak >= 2 && correct && (
        <p className="mt-3 text-sm font-bold text-amber">🔥 {state.me.streak} in a row</p>
      )}

      <div className="card mt-7 flex items-center justify-around p-4">
        <div>
          <p className="label">Rank</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums text-ink">
            #{state.me?.rank}
          </p>
        </div>
        <div className="h-9 w-px bg-line" />
        <div>
          <p className="label">Total</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums text-ink">
            {state.me?.score.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlayerStandings({ state }: { state: PlayerState }) {
  const delta = state.me?.delta ?? 0;
  return (
    <div className="animate-fade-up">
      <div className="text-center">
        <p className="label">After question {state.index + 1}</p>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold text-ink">
          You’re #{state.me?.rank}
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-soft">
          {delta > 0
            ? `▲ Up ${delta} ${delta === 1 ? 'place' : 'places'}`
            : delta < 0
              ? `▼ Down ${-delta} ${delta === -1 ? 'place' : 'places'}`
              : 'Holding your position'}
        </p>
      </div>

      <div className="card mt-6 p-4">
        <h2 className="label mb-3">Top of the board</h2>
        <Leaderboard rows={state.nearby ?? []} highlightId={state.me?.id} limit={5} />
      </div>
    </div>
  );
}

function PlayerFinish({ state }: { state: PlayerState }) {
  const rank = state.me?.rank ?? 0;
  const headline =
    rank === 1 ? '🥇 You won!' : rank <= 3 ? `🏅 ${rank}${rank === 2 ? 'nd' : 'rd'} place!` : 'Quiz complete';

  return (
    <div className="animate-fade-up text-center">
      <h1 className="font-display text-3xl font-extrabold text-ink">{headline}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        {state.me?.score.toLocaleString()} points · rank #{rank} of {state.playerCount}
      </p>

      {state.podium && state.podium.length > 0 && (
        <div className="mt-8">
          <Podium rows={state.podium} highlightId={state.me?.id} />
        </div>
      )}

      <div className="card mt-8 p-4 text-left">
        <h2 className="label mb-3">Final standings</h2>
        <Leaderboard rows={state.nearby ?? []} highlightId={state.me?.id} limit={5} showGain={false} />
      </div>

      <Link to="/" className="btn-outline btn-md mt-7">Done</Link>
    </div>
  );
}
