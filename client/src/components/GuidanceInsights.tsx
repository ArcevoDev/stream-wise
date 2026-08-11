import { Icon } from "@arcevo/facet-components";

interface GuidanceInsightsProps {
  text?: string;
}

export default function GuidanceInsights({ text }: GuidanceInsightsProps) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 border-l-4 border-l-primary">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
          <Icon name="lightbulb" size={16} />
        </span>
        <h3 className="font-bold text-foreground">Guidance Insights</h3>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-2" />
          ) : (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          )
        )}
      </div>
    </div>
  );
}
