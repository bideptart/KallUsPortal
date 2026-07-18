// KallUS brand mark — an audio-waveform "equalizer" icon (bars of varying
// height) flanked by two curved bracket shapes suggesting sound/voice,
// paired with the "KallUS" wordmark.
//
// `size` accepts 'sm' | 'md' | 'lg' or a literal pixel height for the icon.
// `white` renders the icon in mint and the wordmark in white, for dark
// backgrounds; otherwise the icon renders in deep green and the wordmark in
// the standard ink color.
function WaveIcon({ height, color }) {
  const bars = [8, 15, 21, 15, 9, 17, 12];
  const barWidth = 3.6;
  const gap = 2.6;
  const barsWidth = bars.length * barWidth + (bars.length - 1) * gap;
  const midY = 20;
  const barsStartX = 13;
  const width = barsStartX * 2 + barsWidth;

  return (
    <svg
      height={height}
      viewBox={`0 0 ${width} 40`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left bracket "((" */}
      <path
        d="M9 8 C 3.5 13.5, 3.5 26.5, 9 32"
        stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none"
      />
      {/* Equalizer bars */}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={barsStartX + i * (barWidth + gap)}
          y={midY - h / 2}
          width={barWidth}
          height={h}
          rx={barWidth / 2}
          fill={color}
        />
      ))}
      {/* Right bracket "))" */}
      <path
        d={`M${width - 9} 8 C ${width - 3.5} 13.5, ${width - 3.5} 26.5, ${width - 9} 32`}
        stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

export default function Logo({ size = 'md', white = false, showWordmark = true }) {
  const h = typeof size === 'number'
    ? size
    : size === 'lg' ? 52 : size === 'sm' ? 30 : 40;

  const iconColor = white ? '#9fe6b8' : '#6fa524';
  const wordmarkColor = white ? '#ffffff' : 'var(--ink)';

  return (
    <div className="flex items-center gap-2.5 select-none max-w-full" style={{ height: h }}>
      <WaveIcon height={h * 0.72} color={iconColor} />
      {showWordmark && (
        <span
          className="font-display leading-none"
          style={{
            fontWeight: 800,
            letterSpacing: '-0.01em',
            fontSize: h * 0.5,
            color: wordmarkColor,
          }}
        >
          KallUS
        </span>
      )}
    </div>
  );
}
