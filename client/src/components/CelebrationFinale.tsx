import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { HostState } from '../lib/types';
import { Leaderboard } from './Leaderboard';
import { getPlayerEmoji } from '../lib/avatar';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'star';
}

export function CelebrationFinale({ state }: { state: HostState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const winner = state.leaderboard[0];
  const winnerEmoji = winner ? getPlayerEmoji(winner.id, winner.name) : '🏆';

  // Canvas-based fireworks boom blast animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#FBBF24', '#06B6D4'];
    const particles: ConfettiParticle[] = [];

    // Spawn an explosive blast of confetti
    function spawnBlast(originX: number, originY: number, count = 70, power = 14) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * power + 4;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // Initial upward thrust
          size: Math.random() * 10 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          wobble: Math.random() * 10,
          wobbleSpeed: Math.random() * 0.1 + 0.05,
          opacity: 1,
          shape: Math.random() > 0.4 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'star',
        });
      }
    }

    // Initial boom blasts!
    spawnBlast(width / 2, height * 0.35, 120, 16);
    setTimeout(() => spawnBlast(width * 0.25, height * 0.4, 70, 13), 300);
    setTimeout(() => spawnBlast(width * 0.75, height * 0.4, 70, 13), 600);
    setTimeout(() => spawnBlast(width / 2, height * 0.3, 90, 15), 1200);

    // Recurring fireworks interval
    const interval = setInterval(() => {
      const rx = Math.random() * width * 0.8 + width * 0.1;
      const ry = Math.random() * height * 0.4 + height * 0.15;
      spawnBlast(rx, ry, 50, 12);
    }, 2400);

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.985; // drag
        p.vy *= 0.985;
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;

        // Fade out as it falls
        if (p.y > height * 0.8) {
          p.opacity -= 0.015;
        }

        if (p.opacity <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(
              Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size,
              -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size,
            );
            ctx.lineTo(
              Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.size / 2),
              -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.size / 2),
            );
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * Math.sin(p.wobble));
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(interval);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-6 text-center overflow-hidden">
      {/* 1. Fullscreen Celebration Blast Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      />

      {/* 2. Celebration Lights Background Atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Left Sweeping Spotlight Light Beam */}
        <div
          className="absolute -top-24 -left-20 h-[650px] w-[350px] origin-top-left rotate-[28deg] rounded-full opacity-35 blur-3xl animate-pulse"
          style={{
            background: 'conic-gradient(from 180deg at 50% 50%, #F59E0B 0deg, #F43F5E 120deg, transparent 240deg)',
            animationDuration: '4s',
          }}
        />

        {/* Right Sweeping Spotlight Light Beam */}
        <div
          className="absolute -top-24 -right-20 h-[650px] w-[350px] origin-top-right rotate-[-28deg] rounded-full opacity-35 blur-3xl animate-pulse"
          style={{
            background: 'conic-gradient(from 180deg at 50% 50%, #6366F1 0deg, #EC4899 120deg, transparent 240deg)',
            animationDuration: '4.5s',
          }}
        />

        {/* Golden Central Radiant Halo behind Champion */}
        <div className="absolute top-28 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-gradient-to-tr from-amber-300/40 via-yellow-200/50 to-orange-300/30 blur-2xl -z-10 animate-pulse" />
      </div>

      {/* 3. Header title */}
      <div className="animate-fade-up">
        <p className="label font-bold tracking-wider text-brand-600">{state.quiz.title}</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink">
          🎉 Quiz Complete!
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          All questions answered. Here are the final results!
        </p>
      </div>

      {/* 4. TOP ONE PLAYER SPOTLIGHT CARD with CELEBRATION LIGHTS */}
      {winner && (
        <div className="relative mt-8 mx-auto max-w-md animate-fade-up">
          {/* Floating Crown above */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 text-4xl sm:text-5xl filter drop-shadow-md animate-bounce">
            👑
          </div>

          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50 via-surface to-amber-100/40 p-6 sm:p-8 shadow-[0_12px_40px_rgba(245,158,11,0.22)] backdrop-blur-sm">
            {/* Shimmering background beams inside card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-amber-300/10 to-amber-500/20 opacity-50 blur-lg" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Grand Champion Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                ⭐ 1st Place Winner ⭐
              </span>

              {/* Avatar Emoji inside golden glowing ring */}
              <div className="mt-4 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-amber-400 ring-offset-4 select-none">
                <span className="text-5xl sm:text-6xl filter drop-shadow-sm animate-pulse">
                  {winnerEmoji}
                </span>
              </div>

              {/* Winner Name */}
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-black text-ink tracking-tight">
                {winner.name}
              </h2>

              {/* Winner Score */}
              <div className="mt-2 inline-flex items-baseline gap-1.5 rounded-2xl bg-amber-200/60 px-4 py-1.5 border border-amber-300">
                <span className="font-display text-2xl sm:text-3xl font-black tabular-nums text-amber-900">
                  {winner.score.toLocaleString()}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                  points
                </span>
              </div>

              {winner.streak >= 2 && (
                <p className="mt-2 text-xs font-bold text-amber-700">
                  🔥 Best streak: {winner.streak} correct in a row!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. TOP 10 LEADERBOARD (Top to Bottom list) */}
      <div className="mt-10 mx-auto max-w-2xl text-left animate-fade-up [animation-delay:150ms]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="font-display text-lg font-extrabold text-ink">
              Top 10 Leaderboard
            </h3>
          </div>
          <span className="text-xs font-semibold text-ink-mute">
            Ranked by total score
          </span>
        </div>

        <div className="card p-4 sm:p-5 shadow-card border border-line bg-surface">
          <Leaderboard rows={state.leaderboard} limit={10} showGain={false} />
        </div>
      </div>

      {/* 6. Quiz Stats */}
      <dl className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3 sm:gap-4 animate-fade-up [animation-delay:200ms]">
        {[
          [state.stats.players, 'players'],
          [state.stats.questions, 'questions'],
          [`${state.stats.accuracy}%`, 'accuracy'],
        ].map(([big, small]) => (
          <div key={small as string} className="card p-3 sm:p-4 bg-surface">
            <dt className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-ink">{big}</dt>
            <dd className="mt-0.5 text-xs text-ink-mute">{small}</dd>
          </div>
        ))}
      </dl>

      {/* 7. Action Button */}
      <div className="mt-8 animate-fade-up [animation-delay:250ms]">
        <Link to="/dashboard" className="btn-primary btn-lg shadow-md shadow-brand-500/20">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
