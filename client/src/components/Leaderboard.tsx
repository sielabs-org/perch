import type { LeaderRow } from '../lib/types';
import { MEDAL } from '../lib/palette';

function RankDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-xs font-semibold text-ink-mute" title="No change">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-correct' : 'text-wrong'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'place' : 'places'}`}
    >
      {up ? '▲' : '▼'}
      {Math.abs(delta)}
    </span>
  );
}

export function RankBadge({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' }) {
  const medal = rank <= 3 ? MEDAL[rank - 1] : null;
  const dim = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-extrabold tabular-nums ${dim}`}
      style={
        medal
          ? { background: medal, color: '#fff' }
          : { background: '#ececeb', color: '#52514e' }
      }
    >
      {rank}
    </span>
  );
}

export function Leaderboard({ rows, highlightId, limit = 10, showGain = true }: {
  rows: LeaderRow[];
  highlightId?: string;
  limit?: number;
  showGain?: boolean;
}) {
  const visible = rows.slice(0, limit);
  const isHidden = highlightId && !visible.some((r) => r.id === highlightId);
  const mine = isHidden ? rows.find((r) => r.id === highlightId) : undefined;

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-ink-mute">
        No scores yet — the leaderboard fills in after the first question.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {visible.map((row, i) => (
        <LeaderItem key={row.id} row={row} you={row.id === highlightId} index={i} showGain={showGain} />
      ))}
      {mine && (
        <>
          <li className="py-1 text-center text-xs font-semibold text-ink-mute">⋯</li>
          <LeaderItem row={mine} you index={visible.length} showGain={showGain} />
        </>
      )}
    </ol>
  );
}

function LeaderItem({ row, you, index, showGain }: {
  row: LeaderRow; you?: boolean; index: number; showGain: boolean;
}) {
  return (
    <li
      className={`flex animate-fade-up items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        you ? 'border-brand-300 bg-brand-50' : 'border-transparent bg-sunken/60'
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <RankBadge rank={row.rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {row.name}
          {you && <span className="ml-1.5 text-xs font-bold text-brand-600">You</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <RankDelta delta={row.delta} />
          {row.streak >= 2 && (
            <span className="text-xs font-semibold text-amber" title={`${row.streak} correct in a row`}>
              🔥 {row.streak}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-display text-base font-extrabold tabular-nums text-ink">
          {row.score.toLocaleString()}
        </p>
        {showGain && row.gained > 0 && (
          <p className="text-xs font-bold tabular-nums text-correct">+{row.gained.toLocaleString()}</p>
        )}
      </div>
    </li>
  );
}
