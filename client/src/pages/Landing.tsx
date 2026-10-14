import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { api } from '../lib/api';

export default function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError('Enter a 6-digit room code');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await api.lookupSession(clean);
      navigate(`/play?code=${clean}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that room.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F5] text-ink selection:bg-brand-100 font-sans">
      {/* Responsive Top Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-[#FAF9F5]/95 backdrop-blur-sm">
        {/* Main Row */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
          {/* Brand Logo */}
          <Logo />

          {/* Center Join Code in Navbar (Desktop: md and up) */}
          <form
            onSubmit={handleJoin}
            className="hidden md:flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all"
          >
            <span className="text-xs font-medium text-ink-muted whitespace-nowrap pl-1">
              Join code:
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123 456"
              value={code}
              maxLength={7}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                const formatted = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
                setCode(formatted);
                setError('');
              }}
              className="w-28 bg-transparent text-center font-mono text-base font-bold tracking-wider text-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={checking}
              className="rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 px-3.5 py-1 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50"
            >
              {checking ? '…' : 'Join'}
            </button>
          </form>

          {/* Right: Login & Sign Up (Always visible and unclipped) */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-ink-secondary hover:text-ink px-2 py-1.5 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/login?mode=signup"
              className="rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Mobile Join Code Row (Visible only on mobile screens < md) */}
        <div className="md:hidden border-t border-line/40 bg-surface/60 px-4 py-2">
          <form
            onSubmit={handleJoin}
            className="flex items-center justify-between gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20"
          >
            <span className="text-xs font-semibold text-ink-muted pl-1 whitespace-nowrap">
              Join code:
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123 456"
              value={code}
              maxLength={7}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                const formatted = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
                setCode(formatted);
                setError('');
              }}
              className="min-w-0 flex-1 bg-transparent text-center font-mono text-base font-bold tracking-widest text-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={checking}
              className="rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 px-4 py-1 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50"
            >
              {checking ? '…' : 'Join'}
            </button>
          </form>
        </div>

        {error && (
          <div className="border-t border-wrong/20 bg-wrong/5 py-1.5 text-center text-xs font-medium text-wrong">
            {error}
          </div>
        )}
      </header>

      {/* Minimal, Editorial Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3.5 py-1 text-xs font-semibold text-brand-700 mb-6">
            <span>Interactive quizzes & live polling</span>
          </div>

          {/* Bold Mentimeter Style Headline */}
          <h1 className="font-display text-[34px] sm:text-[64px] lg:text-[76px] font-black tracking-tight leading-[1.02] sm:leading-[0.98] text-[#14140F] uppercase">
            LISTEN, LEARN,<br />
            AND THINK.<br />
            <span className="text-brand-500">TOGETHER.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base lg:text-lg text-ink-secondary leading-relaxed px-2">
            Get everyone participating in meetings, classes, or presentations. Create live polls, quizzes, and word clouds with instant audience response.
          </p>

          {/* CTA actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/login?mode=signup"
              className="btn-primary btn-lg w-full sm:w-auto shadow-md shadow-brand-500/20"
            >
              Get started — it's free
            </Link>
            <Link
              to="/login"
              className="btn-outline btn-lg w-full sm:w-auto"
            >
              Host a quiz →
            </Link>
          </div>

          {/* Presentation Preview Card (Minimal & Sleek) */}
          <div className="mt-10 mx-auto w-full max-w-xl rounded-2xl bg-surface p-4 sm:p-7 shadow-xl border border-line text-left">
            <div className="flex items-center justify-between border-b border-line pb-3 text-xs text-ink-muted">
              <span className="font-semibold text-brand-600">LIVE PRESENTATION</span>
              <span className="font-mono text-[11px] font-bold rounded bg-sunken px-2 py-0.5 text-ink">
                CODE: 492 108
              </span>
            </div>

            <h3 className="mt-4 font-display text-lg font-bold text-ink">
              Rank how important each topic is to you
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-ink">1. Interactive audience engagement</span>
                  <span className="font-mono font-bold text-[#2A78D6]">88%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-[#2A78D6]" style={{ width: '88%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-ink">2. Live quiz leaderboards</span>
                  <span className="font-mono font-bold text-[#EB6834]">62%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-[#EB6834]" style={{ width: '62%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-ink">3. Instant no-app room join</span>
                  <span className="font-mono font-bold text-[#1BAF7A]">94%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-[#1BAF7A]" style={{ width: '94%' }} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between pt-3 border-t border-line text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-sunken px-2 py-0.5 text-ink text-[11px]">❤️ 24</span>
                <span className="rounded-full bg-sunken px-2 py-0.5 text-ink text-[11px]">👍 42</span>
                <span className="rounded-full bg-sunken px-2 py-0.5 text-ink text-[11px]">🔥 18</span>
              </div>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                48 responses
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-line/60 py-6 text-center text-xs text-ink-muted">
        <p>© {new Date().getFullYear()} Perch. Interactive presentations & live quizzes.</p>
      </footer>
    </div>
  );
}
