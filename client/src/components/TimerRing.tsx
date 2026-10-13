/** Circular countdown. The number is always visible, so time is never colour-alone. */
export function TimerRing({ seconds, total, size = 76 }: {
  seconds: number; total: number; size?: number;
}) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const urgent = seconds <= 5 && seconds > 0;

  return (
    <div
      className={`relative shrink-0 ${urgent ? 'animate-pulse-ring rounded-full' : ''}`}
      style={{ width: size, height: size }}
      role="timer"
      aria-live="off"
      aria-label={`${seconds} seconds remaining`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ececeb" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={urgent ? '#e34948' : '#2a78d6'}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .12s linear, stroke .3s' }}
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center font-display font-extrabold tabular-nums ${
          urgent ? 'text-wrong' : 'text-ink'
        }`}
        style={{ fontSize: size * 0.34 }}
      >
        {seconds}
      </span>
    </div>
  );
}
