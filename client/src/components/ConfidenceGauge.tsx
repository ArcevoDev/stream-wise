import GeneratedIcon, { type IconName } from "../icons.generated.tsx";

interface ConfidenceGaugeProps {
  value: number;
}

/**
 * Confidence gauge for the DSS display scale.
 *
 * The engine rescales raw confidence (top-stream share of SAW score) into a
 * [50, 100] DISPLAY range (P0-3c, pinned by tests): 50% = "all three streams
 * tied" (the 1/3 baseline), 100% = "clear dominant stream". The thresholds
 * below are tuned to that scale, NOT a generic 0-100 gauge, so a near-baseline
 * profile reads as "emerging signal" instead of a scary red "low confidence".
 */
export default function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));

  // Display-scale bands: 50 = tie baseline, 65 = meaningful lead, 80 = strong.
  const isStrong = clamped >= 80;
  const isClear = clamped >= 65;

  const color = isStrong ? "text-success" : isClear ? "text-warning" : "text-foreground";
  const bgColor = isStrong
    ? "bg-success/10 border-success/30"
    : isClear
      ? "bg-warning/10 border-warning/30"
      : "bg-muted/40 border-border/60";
  const strokeColor = isStrong ? "#10B981" : isClear ? "#F59E0B" : "var(--primary)";
  const textFill = isStrong ? "#059669" : isClear ? "#D97706" : "var(--foreground)";
  const label = isStrong ? "Strong Signal" : isClear ? "Clear Signal" : "Emerging Signal";
  const hint =
    clamped < 65
      ? "Your profile shows some overlap between streams : the recommendation is a starting point, not a verdict."
      : clamped < 80
        ? "Your profile leans meaningfully toward this stream, with some overlap."
        : "Your profile clearly favours this stream.";
  const iconName: IconName = isStrong ? "trending-up" : isClear ? "minus" : "trending-down";

  // SVG arc gauge. Half-circle
  const r = 54;
  const cx = 70;
  const cy = 70;
  const arcLen = Math.PI * r;
  // Offset so the baseline (50%) starts the arc from empty, not half-filled.
  const displayPct = Math.min(100, Math.max(0, ((clamped - 50) / 50) * 100));
  const filled = (displayPct / 100) * arcLen;
  const dashArr = `${filled} ${arcLen}`;

  return (
    <div
      className={`rounded-2xl border-2 ${bgColor} bg-card flex flex-col items-center p-6`}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Confidence Level: ${clamped.toFixed(1)}%, ${label}`}
    >
      <p className="text-sm font-semibold text-muted-foreground mb-2">Confidence Level</p>
      <svg viewBox="0 0 140 80" className="w-44 h-24" aria-hidden="true">
        {/* Background arc */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={dashArr}
          strokeDashoffset="0"
        />
        {/* Value text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="22"
          fontWeight="900"
          fill={textFill}
        >
          {clamped.toFixed(1)}%
        </text>
      </svg>
      <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${color}`}>
        <GeneratedIcon name={iconName} size={14} />
        {label}
      </span>
      <p className="mt-2 flex items-start gap-1.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        <GeneratedIcon name="info" size={12} className="mt-0.5 shrink-0" />
        {hint}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground/60">
        Scale: 50% = all streams equally likely · 100% = clear preference
      </p>
    </div>
  );
}
