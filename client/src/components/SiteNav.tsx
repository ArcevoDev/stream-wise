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
 *  - Mobile (<md): brand + theme toggle + hamburger inline. The auth
 *    actions (login/signup, guest exit, dashboard, account links) live in
 *    the hamburger's stacked mobileMenu so nothing squeezes on a phone.
 */
export default function SiteNav() {
  const { token, role, student, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate("/");
  }

  const isStaff = token && role !== "STUDENT" && role !== "GUEST";
  const isStudent = token && role === "STUDENT";

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

  // Desktop action row: the full set of auth controls.
  const actions = (
    <div className="hidden items-center gap-1.5 sm:flex md:gap-2">
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

  // Mobile-only controls pinned inline next to the brand: theme toggle +
  // hamburger (hamburger is rendered by the Navbar itself via mobileMenu).
  const mobileActions = (
    <div className="flex items-center gap-1 sm:hidden">
      <ThemeToggle />
    </div>
  );

  // Stacked mobile menu content: everything the desktop action row holds,
  // re-expressed as full-width list items inside the hamburger.
  const mobileMenu = (
    <div className="flex flex-col gap-1">
      {token ? (
        <>
          {isStaff && (
            <FacetLink
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              <Icon name="dashboard" size={16} />
              Dashboard
            </FacetLink>
          )}
          {isStudent && (
            <>
              <FacetLink
                href="/results"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
              >
                <Icon name="check" size={16} />
                My Results
              </FacetLink>
              <FacetLink
                href="/history"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
              >
                <Icon name="document" size={16} />
                My History
              </FacetLink>
            </>
          )}
          {role === "GUEST" && (
            <FacetLink
              href="/register"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              <Icon name="arrowRight" size={16} />
              Create account
            </FacetLink>
          )}
          {student && (
            <div className="px-3 pt-3 pb-1">
              <p className="truncate text-sm font-semibold text-foreground">{student.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{student.email}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Icon name="logout" size={16} />
            {role === "GUEST" ? "Exit guest session" : "Logout"}
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
      showMobileMenu
      router={router}
      onNavigate={(href) => navigate(href)}
    />
  );
}
