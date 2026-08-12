import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useResumeStep } from "./hooks/useResumeStep";
import SiteNav from "./components/SiteNav";
import LandingPage from "./pages/LandingPage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Consent from "./pages/Consent";
import Scores from "./pages/Scores";
import RIASEC from "./pages/RIASEC";
import Personality from "./pages/Personality";
import Results from "./pages/Results";
import History from "./pages/History";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStudentDetail from "./pages/admin/AdminStudentDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAudit from "./pages/admin/AdminAudit";

/** Redirect authenticated users away from public-only routes (login / register).
 * The marketing home page is the default hub for everyone: staff and students
 * with nothing pending land there; students mid-assessment resume their step.
 * A GUEST (reviewer session) is treated like a visitor: they may browse the
 * marketing + auth pages only, so they are never diverted into the flow. */
function PublicRoute({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  const [studentLanding, setStudentLanding] = useState<string | null>(null);
  const resumeRoute = useResumeStep(token != null && role === "STUDENT");

  useEffect(() => {
    if (token && role === "STUDENT" && resumeRoute) {
      setStudentLanding(resumeRoute);
    }
  }, [token, role, resumeRoute]);

  if (!token) return <>{children}</>;
  if (role === "GUEST") return <>{children}</>;
  if (role === "STUDENT") {
    // While useResumeStep is still resolving (studentLanding === null), do NOT
    // redirect anywhere: Login/LandingPage already navigate on their own once
    // /auth/progress resolves. Redirecting to "/" here races that navigation
    // (and wins it on slow connections), dumping mid-assessment students on
    // the landing hub instead of resuming their step.
    if (!studentLanding) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      );
    }
    // Only divert mid-assessment students back into the flow. A student who
    // already has a recommendation (nothing pending) stays on the landing hub.
    return studentLanding !== "/history" ? (
      <Navigate to={studentLanding} replace />
    ) : (
      <Navigate to="/" replace />
    );
  }
  return <Navigate to="/" replace />;
}

/** Redirect unauthenticated users to login. Guests have no account, so the
 * assessment flow is out of reach: they are sent to register instead. */
function PrivateRoute({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === "GUEST") return <Navigate to="/register" replace />;
  return <>{children}</>;
}

/** Role-gated area. Client-side convenience; the server enforces via requireRole.
 * The admin console is open to all staff roles: ADMIN gets full access, while
 * COUNSELOR / SCHOOL_ADMIN get a read-only view (the server still 403s any
 * mutation they attempt: this is just the landing surface). */
function RequireStaff({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!role || role === "STUDENT" || role === "GUEST") return <Navigate to="/scores" replace />;
  return <>{children}</>;
}

export default function App() {
  const { pathname } = useLocation();
  // One shared navbar (SiteNav) for the whole app: the landing page, auth
  // pages, consent gate, and assessment flow all render the same pill navbar,
  // so the brand, theme toggle, and account actions are consistent everywhere.
  // The admin console owns its own chrome (fixed sidebar + mobile bar), so
  // the shared nav is hidden there.
  const hideGlobalTopbar = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      {!hideGlobalTopbar && <SiteNav />}
      <main className="flex-1">
        <Routes>
          {/* Consent-first landing: `/` is the informed-consent gate. */}
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/scores"
            element={
              <PrivateRoute>
                <Scores />
              </PrivateRoute>
            }
          />
          <Route
            path="/consent"
            element={
              <Consent />
            }
          />
          <Route
            path="/riasec"
            element={
              <PrivateRoute>
                <RIASEC />
              </PrivateRoute>
            }
          />
          <Route
            path="/personality"
            element={
              <PrivateRoute>
                <Personality />
              </PrivateRoute>
            }
          />
          <Route
            path="/results"
            element={
              <PrivateRoute>
                <Results />
              </PrivateRoute>
            }
          />
          <Route
            path="/results/:id"
            element={
              <PrivateRoute>
                <Results />
              </PrivateRoute>
            }
          />
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
          {/* Staff area (admin console). COUNSELOR / SCHOOL_ADMIN land here
              read-only; ADMIN gets the full dashboard. Server enforces. */}
          <Route
            path="/admin"
            element={
              <RequireStaff>
                <AdminLayout />
              </RequireStaff>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="students/:id" element={<AdminStudentDetail />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
