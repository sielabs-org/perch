import type { LeaderRow } from '../lib/types';
import { MEDAL } from '../lib/palette';

const ORDER = [1, 0, 2]; // silver, gold, bronze — tallest in the middle
const HEIGHTS = ['h-52', 'h-36', 'h-28'];

export function Podium({ rows, highlightId }: { rows: LeaderRow[]; highlightId?: string }) {
  const top = ORDER.map((i) => rows[i]).filter(Boolean);
  if (!rows.length) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {top.map((row) => {
        const place = row.rank - 1;
        const medal = MEDAL[place] ?? '#86857f';
        return (
          <div
            key={row.id}
            className="flex w-28 animate-fade-up flex-col items-center sm:w-36"
            style={{ animationDelay: `${(2 - place) * 220}ms` }}
          >
            <span className="mb-1 text-3xl" aria-hidden="true">
              {['🥇', '🥈', '🥉'][place]}
            </span>
            <p
              className={`max-w-full truncate text-center font-display font-extrabold text-ink ${
                place === 0 ? 'text-lg' : 'text-base'
              } ${row.id === highlightId ? 'underline decoration-brand-500 decoration-2 underline-offset-4' : ''}`}
              title={row.name}
            >
              {row.name}
            </p>
            <p className="mb-2 text-sm font-bold tabular-nums text-ink-soft">
              {row.score.toLocaleString()}
            </p>
            <div
              className={`flex w-full items-start justify-center rounded-t-xl pt-3 font-display text-2xl font-extrabold text-white ${HEIGHTS[place]}`}
              style={{ background: medal, boxShadow: '0 0 0 2px var(--surface-1)' }}
            >
              {row.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}
