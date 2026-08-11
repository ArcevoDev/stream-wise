import { Card, CardContent, Icon } from "@arcevo/facet-components";
import { FEATURES, STEPS, WHY_POINTS } from "./content";

/**
 * The static body sections of the marketing landing page: feature cards,
 * "How it works" steps, and the "Why StreamWise?" problem-in-numbers stats.
 * Data-driven from content.ts so the page stays declarative.
 */
export default function LandingSections() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="glass" className="rounded-2xl border-border/60">
            <CardContent className="pt-6">
              <Icon name={f.icon} size={22} className="text-primary" />
              <h3 className="mt-3 font-bold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-12">
        <h2 className="text-center text-xl font-black text-foreground">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card/60 p-4">
              <span className="text-2xl font-black text-primary/40">{s.n}</span>
              <h3 className="mt-1 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why StreamWise exists: the full problem in numbers */}
      <div className="mt-16">
        <h2 className="text-center text-xl font-black text-foreground">Why StreamWise?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Choosing a stream at age 14 or 15 fixes the subjects students will sit at WAEC/NECO and the
          courses they can apply for. The numbers below show how poorly that decision is currently
          supported.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {WHY_POINTS.map((s) => (
            <Card key={s.title} variant="glass" className="h-full rounded-2xl border-border/60 text-left">
              <CardContent className="flex h-full flex-col pt-6">
                <Icon name={s.icon} size={20} className="text-primary" />
                <p className="mt-3 text-2xl font-black tracking-tight tabular-nums text-foreground">
                  {s.stat}
                </p>
                <h3 className="mt-1 text-sm font-bold leading-snug text-foreground">{s.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.text}</p>
                <p className="mt-auto pt-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {s.source}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
