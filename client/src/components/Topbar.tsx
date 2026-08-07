import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import {
  Navbar,
  Button,
  Icon,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  type NavLink as FacetNavLink,
} from "@arcevo/facet-components";

interface NavStep {
  path: string;
  label: string;
}

const STEPS: NavStep[] = [
  { path: "/scores", label: "Academic Scores" },
  { path: "/riasec", label: "Interest Quiz" },
  { path: "/personality", label: "Personality" },
  { path: "/results", label: "Results" },
];

/** react-router adapter so facet Navbar renders SPA links + active state. */
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

export default function Topbar() {
  const { token, student, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate("/");
  }

  const initials =
    student?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const studentLinks: FacetNavLink[] = STEPS.map((s) => ({
    href: s.path,
    label: s.label,
  }));

  // Students see the 4 assessment steps; staff see nothing in the tray (their
  // primary surface is the Dashboard button + account menu).
  const links: FacetNavLink[] = token && role === "STUDENT" ? studentLinks : [];

  const brand = (
    <div className="flex items-center gap-3">
      <span className="flex items-center rounded-lg bg-primary p-1.5 text-primary-foreground">
        <Icon name="bookOpen" size={16} />
      </span>
      <div className="leading-tight">
        <span className="hidden font-bold tracking-tight text-foreground sm:inline">StreamWise</span>
        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground sm:hidden">
          StreamWise
        </span>
        <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">
          Weighted Decision Support System
        </span>
      </div>
    </div>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {token ? (
        <>
          {role !== "STUDENT" && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/admin">
                <Icon name="dashboard" size={14} />
                Dashboard
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium text-foreground">{student?.fullName}</p>
                <p className="text-xs font-normal text-muted-foreground">{student?.email}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {role ?? "STUDENT"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === "STUDENT" ? (
                <DropdownMenuItem onSelect={() => navigate("/results")}>
                  <Icon name="document" size={16} />
                  My Results
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => navigate("/admin")}>
                  <Icon name="dashboard" size={16} />
                  Staff Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Icon name="logout" size={16} />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      variant="sticky"
      brand={brand}
      links={links}
      actions={actions}
      router={router}
      onNavigate={(href) => navigate(href)}
      showMobileMenu={false}
    />
  );
}
