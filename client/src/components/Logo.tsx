import { Link } from 'react-router-dom';

export function Logo({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="QuizDeck home">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-500 shadow-[0_2px_0_#1c5cab]">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect x="1.5" y="8" width="3.6" height="8.5" rx="1.4" fill="#fff" opacity=".65" />
          <rect x="7.2" y="4" width="3.6" height="12.5" rx="1.4" fill="#fff" />
          <rect x="12.9" y="1" width="3.6" height="15.5" rx="1.4" fill="#fff" opacity=".8" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[17px] font-extrabold tracking-tight text-ink">
          Quiz<span className="text-brand-500">Deck</span>
        </span>
      )}
    </Link>
  );
}
