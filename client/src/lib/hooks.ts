import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to a server-supplied timestamp. The offset between the server
 * clock and the device clock is measured once per state push, so a phone with
 * a skewed clock still sees the same timer as the presentation screen.
 */
export function useCountdown(endsAt: number, serverNow: number) {
  const offsetRef = useRef(0);
  if (serverNow) offsetRef.current = serverNow - Date.now();

  const remaining = () =>
    Math.max(0, endsAt - (Date.now() + offsetRef.current));

  const [ms, setMs] = useState(remaining);

  useEffect(() => {
    setMs(remaining());
    if (!endsAt) return;
    const id = setInterval(() => setMs(remaining()), 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, serverNow]);

  return { ms, seconds: Math.ceil(ms / 1000) };
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / blocked storage — fall back to in-memory only */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Animates a number toward its target so score changes read as a count-up. */
export function useAnimatedNumber(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/** Fires once when `key` changes — used to retrigger entrance animations. */
export function useKeyedReset(key: unknown) {
  const [nonce, setNonce] = useState(0);
  const prev = useRef(key);
  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      setNonce((n) => n + 1);
    }
  }, [key]);
  return nonce;
}
