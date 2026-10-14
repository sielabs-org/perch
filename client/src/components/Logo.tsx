import { Link } from 'react-router-dom';

export function Logo({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-end gap-2.5" aria-label="Perch home">
      {/* Blocks forming the letter "P" — each piece a different color */}
      <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
        {/* Stem — tall left vertical bar */}
        <rect x="0" y="0" width="8" height="34" fill="#6C5CE7" />
        {/* Bowl top — horizontal bar */}
        <rect x="8" y="0" width="14" height="7" fill="#FDCB6E" />
        {/* Bowl right — vertical bar */}
        <rect x="22" y="0" width="8" height="20" fill="#00B894" />
        {/* Bowl bottom — horizontal bar closing the bump */}
        <rect x="8" y="15" width="14" height="5" fill="#E17055" />
      </svg>
      {!compact && (
        <span className="mb-[-2px] font-display text-[19px] font-extrabold leading-none tracking-tight text-ink">
          Perch
        </span>
      )}
    </Link>
  );
}


