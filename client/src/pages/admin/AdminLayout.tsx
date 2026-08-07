import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  ScrollText,
  Download,
  LogOut,
  BookMarked,
} from "lucide-react";
import { Button } from "@arcevo/facet-components";
import { api } from "@/api";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Students", icon: Users, end: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, end: false },
  { to: "/admin/audit", label: "Audit Trail", icon: ScrollText, end: false },
];

export default function AdminLayout() {
  const { student, role, logout } = useAuth();
  // COUNSELOR / SCHOOL_ADMIN land here read-only; the server still 403s any
  // ADMIN-only mutation (rescore, CSV export, etc.). Hide those affordances.
  const isAdmin = role === "ADMIN";

  function handleLogout(): void {
    logout();
  }

  async function handleExport(): Promise<void> {
    try {
      const res = await api.get("/admin/export/csv", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dss-students-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // The axios interceptor surfaces auth errors; a silent failure here is fine.
    }
  }

  const initials =
    student?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-muted/30">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <span className="flex items-center rounded-lg bg-primary p-1.5 text-primary-foreground">
            <BookMarked size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">
              {isAdmin ? "Admin Console" : "Staff Console"}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              StreamWise DSS · {role}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2.5 mt-4"
              onClick={handleExport}
            >
              <Download size={16} />
              Export CSV
            </Button>
          )}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{student?.fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{student?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-background md:hidden">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
