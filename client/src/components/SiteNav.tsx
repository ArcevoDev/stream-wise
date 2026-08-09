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
 */
export default function SiteNav() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate("/");
  }

  const brand = (
    <Link to="/" className="flex items-center gap-3" aria-label="StreamWise home">
      <BrandLogo className="h-9 w-9" />
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-foreground">StreamWise</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Weighted Decision Support System
        </p>
      </div>
    </Link>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {token ? (
        <>
          {role !== "STUDENT" && role !== "GUEST" && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
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

  return (
    <Navbar
      variant="pill"
      className="z-[100] bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      brand={brand}
      links={[]}
      actions={actions}
      router={router}
      onNavigate={(href) => navigate(href)}
      showMobileMenu={false}
    />
  );
}
