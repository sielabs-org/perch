import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CopyButton } from './ui';

/** The "how to join" block shown on the presentation screen. */
export function JoinPanel({
  code,
  compact = false,
  vertical = false,
}: {
  code: string;
  compact?: boolean;
  vertical?: boolean;
}) {
  const joinUrl = `${window.location.origin}/play?code=${code}`;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#14140f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => !cancelled && setQr(url))
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  const host = window.location.host;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Join code</p>
          <p className="font-mono text-xl font-bold tracking-[.14em] text-ink">{code}</p>
        </div>
        {qr && <img src={qr} alt={`QR code to join at ${joinUrl}`} className="h-12 w-12 rounded-md border border-line" />}
      </div>
    );
  }

  if (vertical) {
    return (
      <div className="card flex flex-col items-center gap-5 p-6 text-center">
        <div className="shrink-0 rounded-2xl border border-line bg-white p-3 shadow-xs">
          {qr ? (
            <img src={qr} alt={`QR code to join the quiz at ${joinUrl}`} className="h-44 w-44" />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-lg bg-sunken" />
          )}
        </div>

        <div className="w-full">
          <p className="label">Step 1 — go to</p>
          <p className="mt-1 font-display text-lg font-extrabold text-ink break-all">{host}/play</p>

          <p className="label mt-4">Step 2 — enter code</p>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <p className="font-mono text-3xl font-bold tracking-[.18em] text-brand-600">{code}</p>
            <CopyButton value={code} label="Copy code" />
          </div>

          <p className="mt-3 text-xs text-ink-mute">
            Scan QR with your phone camera or enter the 6-digit code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-7">
      <div className="shrink-0 rounded-2xl border border-line bg-white p-2.5">
        {qr ? (
          <img src={qr} alt={`QR code to join the quiz at ${joinUrl}`} className="h-36 w-36" />
        ) : (
          <div className="h-36 w-36 animate-pulse rounded-lg bg-sunken" />
        )}
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="label">Step 1 — go to</p>
        <p className="mt-1 break-all font-display text-xl font-extrabold text-ink">{host}/play</p>

        <p className="label mt-4">Step 2 — enter the code</p>
        <div className="mt-1.5 flex items-center justify-center gap-2 sm:justify-start">
          <p className="font-mono text-4xl font-bold tracking-[.18em] text-brand-600">{code}</p>
          <CopyButton value={code} label="Copy code" />
        </div>

        <p className="mt-3 text-xs text-ink-mute">
          Or scan the code — it opens the room on a phone with the code filled in.
        </p>
      </div>
    </div>
  );
}
