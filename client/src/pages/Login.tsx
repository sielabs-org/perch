import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

const DUMMY_USER = { username: 'abhishekaslk', password: 'abhishekaslk' };

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(newMode: 'login' | 'signup') {
    setMode(newMode);
    setError('');
    setSearchParams(newMode === 'signup' ? { mode: 'signup' } : {});
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    // Simulate verification delay
    setTimeout(() => {
      if (mode === 'login') {
        if (username === DUMMY_USER.username && password === DUMMY_USER.password) {
          sessionStorage.setItem('perch_user', username);
          navigate('/dashboard');
        } else {
          setError('Invalid username or password.');
        }
      } else {
        // Sign up flow
        sessionStorage.setItem('perch_user', username);
        navigate('/dashboard');
      }
      setLoading(false);
    }, 350);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar with back to home */}
      <header className="flex items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 text-ink hover:opacity-80 transition-opacity">
          <Logo compact />
          <span className="font-display text-[18px] font-bold text-ink">Perch</span>
        </Link>
        <Link to="/" className="btn-ghost btn-sm text-xs">
          ← Back to join
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-8">
        {/* Card */}
        <div className="card w-full max-w-sm animate-fade-up p-6 sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-sunken p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-mute hover:text-ink'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-mute hover:text-ink'
              }`}
            >
              Sign up
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="mt-1 text-sm text-ink-mute">
            {mode === 'login'
              ? 'Sign in to create, edit, and host quizzes.'
              : 'Sign up to start hosting your interactive quizzes.'}
          </p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="label text-xs font-semibold text-ink">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="field mt-1.5 h-11 w-full text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="label text-xs font-semibold text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="field mt-1.5 h-11 w-full text-sm"
              />
            </div>

            {error && <Banner>{error}</Banner>}

            <button
              type="submit"
              className="btn-primary btn-lg mt-2 w-full text-sm font-semibold"
              disabled={loading}
            >
              {loading
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-ink-mute">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
