import { useState } from 'react';
import { OptionShape } from './OptionShape';
import { optionColor } from '../lib/palette';

export interface ResultBar {
  optionId: string;
  text: string;
  correct: boolean;
  count: number;
}

/**
 * Answer distribution for one question.
 *
 * Form: a column chart — the job is comparing magnitude across a handful of
 * named categories. Each column is directly labelled with its count and share,
 * and carries the option's letter + shape, so identity never rests on colour.
 */
export function ResultsChart({ bars, totalAnswers, compact = false }: {
  bars: ResultBar[];
  totalAnswers: number;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.count));
  const plotHeight = compact ? 150 : 300;

  return (
    <figure className="w-full">
      <div
        className="flex items-end gap-2 sm:gap-3"
        style={{ height: plotHeight }}
        role="list"
        aria-label="Answer distribution"
      >
        {bars.map((bar, i) => {
          const color = optionColor(i);
          const share = totalAnswers ? Math.round((bar.count / totalAnswers) * 100) : 0;
          // Floor of 6px so a zero-count option still reads as a column.
          const h = Math.max(6, (bar.count / max) * (plotHeight - 42));
          const active = hovered === bar.optionId;

          return (
            <div
              key={bar.optionId}
              role="listitem"
              className="group relative flex h-full flex-1 flex-col justify-end items-center"
              onMouseEnter={() => setHovered(bar.optionId)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(bar.optionId)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              aria-label={`${color.letter}. ${bar.text || 'Untitled option'} — ${bar.count} ${
                bar.count === 1 ? 'vote' : 'votes'
              }, ${share}%${bar.correct ? ', correct answer' : ''}`}
            >
              {active && (
                <div className="pointer-events-none absolute bottom-full z-20 mb-2 w-max max-w-[220px] animate-pop-in rounded-xl border border-line bg-surface px-3 py-2 text-left shadow-lift">
                  <p className="text-[13px] font-semibold leading-snug text-ink">
                    {bar.text || `Option ${color.letter}`}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {bar.count} {bar.count === 1 ? 'vote' : 'votes'} · {share}% of answers
                  </p>
                  {bar.correct && (
                    <p className="mt-1 text-xs font-bold text-correct">✓ Correct answer</p>
                  )}
                </div>
              )}

              <span
                className={`mb-1.5 font-display font-extrabold tabular-nums ${
                  compact ? 'text-base' : 'text-2xl'
                } ${bar.count ? 'text-ink' : 'text-ink-mute'}`}
              >
                {bar.count}
              </span>

              <div
                className="w-full origin-bottom animate-grow-bar rounded-t-[4px] transition-[filter] duration-150"
                style={{
                  height: h,
                  background: color.hex,
                  animationDelay: `${i * 70}ms`,
                  filter: active ? 'brightness(1.08)' : undefined,
                  // 2px surface ring keeps adjacent fills from merging.
                  boxShadow: `0 0 0 2px var(--surface-1)`,
                }}
              />

              <div className="mt-2.5 flex w-full flex-col items-center gap-1">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ background: color.hex }}
                >
                  <OptionShape shape={color.shape} size={11} />
                </span>
                <span
                  className={`line-clamp-2 text-center text-[11px] leading-tight sm:text-xs ${
                    bar.correct ? 'font-bold text-ink' : 'font-medium text-ink-soft'
                  }`}
                  title={bar.text}
                >
                  {bar.correct && <span className="text-correct">✓ </span>}
                  {bar.text || `Option ${color.letter}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <figcaption className="mt-4 border-t border-line pt-2.5 text-center text-xs font-medium text-ink-mute">
        {totalAnswers} {totalAnswers === 1 ? 'answer' : 'answers'} submitted
      </figcaption>
    </figure>
  );
}
