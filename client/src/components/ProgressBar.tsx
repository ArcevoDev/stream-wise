import { CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@arcevo/facet-components";

interface ProgressBarProps {
  step: number;
  total?: number;
  labels?: string[];
}

export default function ProgressBar({ step, total = 4, labels = [] }: ProgressBarProps) {
  const pct = Math.round((step / total) * 100);

  return (
    <div className="w-full">
      {/* Numeric summary */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>
          Step {step} of {total}
        </span>
        <span>{pct}% complete</span>
      </div>

      {/* Facet Progress track */}
      <Progress value={pct} />

      {/* Step indicators */}
      {labels.length > 0 && (
        <div className="flex justify-between mt-3">
          {labels.map((l, i) => {
            const stepNum = i + 1;
            const done = stepNum < step;
            const active = stepNum === step;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 min-w-0">
                {done ? (
                  <CheckCircle2 size={14} className="text-primary shrink-0" />
                ) : (
                  <Circle
                    size={14}
                    className={`shrink-0 ${active ? "text-primary" : "text-muted-foreground/30"}`}
                  />
                )}
                <span
                  className={`text-[10px] font-medium text-center leading-tight ${
                    active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {l}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
