import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import { STEPS } from "./content";

export default function LandingFooter() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
      {/* Brand + one-liner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-8 w-8" />
          <span className="text-sm font-bold tracking-tight text-foreground">StreamWise</span>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          A weighted decision support system that helps Nigerian SS2 students choose an
          academic stream with research-backed confidence.
        </p>
      </div>

      {/* Product */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</h4>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li>
            <Link to="/scores" className="transition-colors hover:text-foreground">
              Take the Assessment
            </Link>
          </li>
          <li>
            <Link to="/consent" className="transition-colors hover:text-foreground">
              Informed Consent
            </Link>
          </li>
          <li>
            <Link to="/history" className="transition-colors hover:text-foreground">
              My Results
            </Link>
          </li>
        </ul>
      </div>

      {/* How it works */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">How it works</h4>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="font-semibold text-foreground">{s.n}</span> · {s.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Research notice */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Research</h4>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          StreamWise is a final-year academic project, not an official LASU, NERDC, or JAMB
          service. Its recommendation is a decision aid, not a replacement for a qualified
          guidance counsellor.
        </p>
      </div>

      {/* Bottom bar */}
      <div className="flex flex-col gap-3 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <p>© {new Date().getFullYear()} StreamWise. Final-year academic project.</p>
        <div className="flex items-center gap-4">
          <Link to="/consent" className="transition-colors hover:text-foreground">
            Consent
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
