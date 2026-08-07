import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import Topbar from "./components/Topbar";
import ConsentLanding from "./pages/ConsentLanding";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Consent from "./pages/Consent";
import Scores from "./pages/Scores";
import RIASEC from "./pages/RIASEC";
import Personality from "./pages/Personality";
import Results from "./pages/Results";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStudentDetail from "./pages/admin/AdminStudentDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminAudit from "./pages/admin/AdminAudit";

/** Redirect authenticated users away from public-only routes (login / register).
 * Role-aware landing: staff roles go to the admin console; students continue
 * the assessment flow. Non-student roles have no SS2 assessment data, so
 * sending them to /scores would just 403 on the recommend endpoint. */
function PublicRoute({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  if (!token) return <>{children}</>;
  return role === "STUDENT" ? <Navigate to="/scores" replace /> : <Navigate to="/admin" replace />;
}

/** Redirect unauthenticated users to login. */
function PrivateRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Role-gated area. Client-side convenience; the server enforces via requireRole.
 * The admin console is open to all staff roles: ADMIN gets full access, while
 * COUNSELOR / SCHOOL_ADMIN get a read-only view (the server still 403s any
 * mutation they attempt — this is just the landing surface). */
function RequireStaff({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!role || role === "STUDENT") return <Navigate to="/scores" replace />;
  return <>{children}</>;
}

export default function App() {
  const { pathname } = useLocation();
  // The consent-first landing page owns its own nav via LandingLayout (LASU
  // brand block + pill nav). Rendering the global Topbar there too creates a
  // double navbar, so it is hidden on `/`.
  const hideGlobalTopbar = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      {!hideGlobalTopbar && <Topbar />}
      <main className="flex-1">
        <Routes>
          {/* Consent-first landing: `/` is the informed-consent gate. */}
          <Route path="/" element={<ConsentLanding />} />
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
              <PrivateRoute>
                <Consent />
              </PrivateRoute>
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
