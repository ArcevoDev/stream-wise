import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";
import AccountMenu from "./AccountMenu";
import { Navbar, Button, Icon } from "@arcevo/facet-components";

/** react-router adapter so the facet Navbar renders SPA links. */
function FacetLink({ href, children, className, onClick }: { href: string; className?: string; children?: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

const router = {
  Link: FacetLink,
  isActive: (href: string) => window.location.pathname.startsWith(href),
};

/**
 * Site-wide navigation bar. One navbar for the whole app: the marketing
 * landing page, auth pages, consent gate, and the assessment flow all render
 * this same component, so the brand, theme toggle, and account actions look
 * identical everywhere.
 *
 * Responsive split:
 *  - Desktop (md+): brand + full action row (theme toggle, auth buttons,
 *    account avatar menu) inline.
 *  - Mobile (<md): brand + theme toggle + account avatar inline when
 *    authenticated (the avatar menu already carries results/history/logout,
 *    so a hamburger is redundant). Anonymous visitors and guest reviewers
 *    get the hamburger instead: login/signup and guest actions are too
 *    many to squeeze inline on a phone, so they live in the stacked
 *    mobileMenu.
 */
export default function SiteNav() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate("/");
  }

  const isStaff = token && role !== "STUDENT" && role !== "GUEST";
  // Real authenticated users (not guests) get the avatar menu inline on every
  // breakpoint; only they can skip the hamburger entirely.
  const avatarOnMobile = token != null && role !== "GUEST";

  const brand = (
    <Link to="/" className="flex items-center gap-2.5 min-w-0" aria-label="StreamWise home">
      <BrandLogo className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
      <div className="leading-tight min-w-0">
        <p className="text-sm font-bold tracking-tight text-foreground truncate">StreamWise</p>
        <p className="hidden text-[10px] uppercase tracking-widest text-muted-foreground min-[480px]:block">
          Weighted Decision Support System
        </p>
      </div>
    </Link>
  );

  // Desktop action row: the full set of auth controls. Must match the facet
  // Navbar's hamburger breakpoint (md:hidden): the hamburger shows below md,
  // so this row only appears from md up.
  const actions = (
    <div className="hidden items-center gap-1.5 md:flex md:gap-2">
      <ThemeToggle />
      {token ? (
        <>
          {isStaff && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <Icon name="dashboard" size={14} />
                Dashboard
              </Link>
            </Button>
          )}
          {role === "GUEST" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/register">Create account</Link>
              </Button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Exit guest
              </button>
            </>
          ) : (
            <AccountMenu />
          )}
        </>
      ) : (
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Get Started</Link>
          </Button>
        </>
      )}
    </div>
  );

  // Mobile controls. Authenticated users (real accounts, not guests) show
  // the account avatar inline; the hamburger is then suppressed via
  // showMobileMenu={false} because the avatar menu already covers
  // results/history/dashboard/logout. Anonymous visitors and guests keep the
  // hamburger with the stacked mobileMenu.
  const mobileActions = avatarOnMobile ? (
    <div className="flex items-center gap-1.5 md:hidden">
      <ThemeToggle />
      <AccountMenu />
    </div>
  ) : (
    <div className="flex items-center gap-1 md:hidden">
      <ThemeToggle />
    </div>
  );

  // Stacked mobile menu content, shown inside the hamburger. Only reachable
  // when the visitor is anonymous or a guest reviewer: real authenticated
  // users get the avatar menu inline on every breakpoint instead.
  const mobileMenu = (
    <div className="flex flex-col gap-1">
      {role === "GUEST" ? (
        <>
          <FacetLink
            href="/register"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
          >
            <Icon name="arrowRight" size={16} />
            Create account
          </FacetLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Icon name="logout" size={16} />
            Exit guest session
          </button>
        </>
      ) : (
        <>
          <FacetLink
            href="/login"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
          >
            <Icon name="user" size={16} />
            Login
          </FacetLink>
          <FacetLink
            href="/register"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </FacetLink>
        </>
      )}
    </div>
  );

  return (
    <Navbar
      variant="pill"
      className="z-[100] bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      brand={brand}
      links={[]}
      actions={
        <>
          {actions}
          {mobileActions}
        </>
      }
      mobileMenu={mobileMenu}
      // Authenticated users (real accounts) navigate with the inline avatar
      // menu alone; the hamburger is only for anonymous visitors and guests.
      showMobileMenu={!avatarOnMobile}
      router={router}
      onNavigate={(href) => navigate(href)}
    />
  );
}
