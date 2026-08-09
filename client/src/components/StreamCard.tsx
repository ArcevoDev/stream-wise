import { FlaskConical, BookOpen, TrendingUp, Star, type LucideIcon } from "lucide-react";
import type { Stream } from "@/types/index.js";

interface StreamMeta {
  Icon: LucideIcon;
  subjects: string;
  /** Theme-aware container: token + alpha, works in light and dark. */
  bg: string;
  badge: string;
  bar: string;
  iconBg: string;
  iconColor: string;
}

// Stream accents map onto the tailwind `science`/`humanities`/`business`
// colors from tailwind.config.ts (stable hexes). Tints use /10 alpha so they
// read correctly on both light and dark backgrounds.
const STREAM_META: Record<Stream, StreamMeta> = {
  Science: {
    Icon: FlaskConical,
    subjects: "Biology · Chemistry · Physics",
    bg: "bg-science/10 border-science/40",
    badge: "bg-science/15 text-science",
    bar: "bg-science",
    iconBg: "bg-science/15",
    iconColor: "text-science",
  },
  Humanities: {
    Icon: BookOpen,
    subjects: "Literature · Government · History",
    bg: "bg-humanities/10 border-humanities/40",
    badge: "bg-humanities/15 text-humanities",
    bar: "bg-humanities",
    iconBg: "bg-humanities/15",
    iconColor: "text-humanities",
  },
  Business: {
    Icon: TrendingUp,
    subjects: "Economics · Commerce · Accounting",
    bg: "bg-business/10 border-business/40",
    badge: "bg-business/15 text-business",
    bar: "bg-business",
    iconBg: "bg-business/15",
    iconColor: "text-business",
  },
};

interface StreamCardProps {
  stream: Stream;
  score: number;
  rank: number;
  maxScore: number;
}

export default function StreamCard({ stream, score, rank, maxScore }: StreamCardProps) {
  const meta = STREAM_META[stream] ?? STREAM_META.Science;
  // Explicit class maps above (no dynamic bg-${color}-100). Fixes the
  // Tailwind JIT safelist risk flagged in the roadmap.
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const isTop = rank === 1;
  const { Icon } = meta;

  return (
    <div
      className={`relative border-2 rounded-2xl p-5 transition-all ${
        isTop ? meta.bg + " shadow-md" : "bg-card border-border"
      }`}
    >
      {isTop && (
        <span
          className={`absolute -top-3 left-4 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${meta.badge}`}
        >
          <Star size={10} className="fill-current" />
          Top Recommendation
        </span>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${meta.iconBg}`}>
            <Icon size={18} className={meta.iconColor} />
          </span>
          <div>
            <p className="font-bold text-foreground">{stream} Stream</p>
            <p className="text-xs text-muted-foreground">{meta.subjects}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-foreground">{(score * 100).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">SAW score ×100</p>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${meta.bar} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground mt-1">Rank #{rank}</p>
    </div>
  );
}
