import { useEffect, useState, type ReactNode } from 'react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-ink-mute">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-7 w-7 text-brand-500" />
        <p className="text-sm font-medium">{label}…</p>
      </div>
    </div>
  );
}

export function EmptyState({ emoji, title, body, action }: {
  emoji: string; title: string; body: string; action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden="true">{emoji}</span>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function Banner({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  const tones = {
    error: 'bg-wrong/10 text-wrong border-wrong/20',
    info: 'bg-brand-50 text-brand-700 border-brand-100',
  } as const;
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${tones[tone]}`}>
      <span aria-hidden="true" className="mt-px">{tone === 'error' ? '⚠' : 'ℹ'}</span>
      <span>{children}</span>
    </div>
  );
}

/** Copy-to-clipboard with inline confirmation, degrading quietly if blocked. */
export function CopyButton({ value, label = 'Copy', className = 'btn-outline btn-sm' }: {
  value: string; label?: string; className?: string;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? '✓ Copied' : label}
    </button>
  );
}
