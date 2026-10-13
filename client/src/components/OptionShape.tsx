/**
 * Each answer option carries a shape as well as a colour. This is the
 * secondary encoding that keeps options distinguishable for colour-blind
 * players and in grayscale print/projection.
 */
export function OptionShape({ shape, size = 16, className = '' }: {
  shape: string;
  size?: number;
  className?: string;
}) {
  const common = { fill: 'currentColor' };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden="true">
      {shape === 'triangle' && <polygon points="10,2.5 18.5,17.5 1.5,17.5" {...common} />}
      {shape === 'diamond' && <polygon points="10,1.5 18.5,10 10,18.5 1.5,10" {...common} />}
      {shape === 'circle' && <circle cx="10" cy="10" r="8.2" {...common} />}
      {shape === 'square' && <rect x="2.2" y="2.2" width="15.6" height="15.6" rx="2.6" {...common} />}
    </svg>
  );
}
