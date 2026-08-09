import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Icon,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@arcevo/facet-components";

/**
 * Authenticated user menu: avatar trigger + dropdown (results/history for
 * students, staff console for staff, logout). Shared by the global SiteNav
 * so the signed-in identity shows the same everywhere.
 */
export default function AccountMenu() {
  const { student, role, logout } = useAuth();
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

  const roleLabel = role && role !== "STUDENT" ? role.replaceAll("_", " ").toLowerCase() : "student";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-1.5 shadow-xl">
        <DropdownMenuLabel className="px-2.5 pb-1.5 pt-2.5">
          <p className="truncate text-sm font-semibold text-foreground">{student?.fullName}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{student?.email}</p>
        </DropdownMenuLabel>
        <div className="px-2.5 pb-2">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {roleLabel}
          </span>
        </div>
        <DropdownMenuSeparator />
        {role === "STUDENT" ? (
          <>
            <DropdownMenuItem onSelect={() => navigate("/results")} className="cursor-pointer rounded-md py-2">
              <Icon name="check" size={16} />
              My Results
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/history")} className="cursor-pointer rounded-md py-2">
              <Icon name="document" size={16} />
              My History
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => navigate("/admin")} className="cursor-pointer rounded-md py-2">
            <Icon name="dashboard" size={16} />
            Staff Dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleLogout}
          className="cursor-pointer rounded-md py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Icon name="logout" size={16} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
