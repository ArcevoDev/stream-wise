import { createContext, useContext, useState, useCallback, useEffect, createElement, type ReactNode } from "react";
import { toast } from "sonner";
import { api, registerAuthClearHandler } from "@/api/axios";
import type { AuthResponse, AuthStudent, ConsentPayload, RegisterPayload, UserRole } from "@/types";

interface AuthContextValue {
  token: string | null;
  student: AuthStudent | null;
  role: UserRole | null;
  /** Derived from POST /auth/consent status. True until all four points are granted. */
  consentRequired: boolean | null;
  /** Refresh student + consentRequired from GET /auth/profile. Returns the derived
   * consentRequired (false = consent granted) so callers can route without
   * racing the state update. */
  refreshIdentity: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  consent: (payload: ConsentPayload) => Promise<void>;
  logout: () => void;
  /** Called by the axios interceptor on 401/403 so React state resets too. */
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Old sessions stored before the role field existed. Default to STUDENT. */
function normalizeStudent(raw: string | null): AuthStudent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthStudent>;
    if (!parsed.id || !parsed.fullName || !parsed.email) return null;
    return { ...parsed, role: parsed.role ?? "STUDENT" } as AuthStudent;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("dss_token") ?? null);
  const [student, setStudent] = useState<AuthStudent | null>(() =>
    normalizeStudent(localStorage.getItem("dss_student")),
  );
  const [consentRequired, setConsentRequired] = useState<boolean | null>(null);

  const persist = useCallback((data: AuthResponse) => {
    localStorage.setItem("dss_token", data.token);
    localStorage.setItem("dss_student", JSON.stringify(data.student));
    setToken(data.token);
    setStudent(data.student);
    setConsentRequired(null); // re-derive from /auth/profile on next app load
  }, []);

  const refreshIdentity = useCallback(async (): Promise<boolean> => {
    if (!localStorage.getItem("dss_token")) return true;
    try {
      const { data } = await api.get<{ student: AuthStudent; consentRequired?: boolean }>("/auth/profile");
      localStorage.setItem("dss_student", JSON.stringify(data.student));
      setStudent(data.student);
      const next = data.consentRequired ?? true;
      setConsentRequired(next);
      return next;
    } catch {
      /* interceptor handles 401/403 */
      return true;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    persist(data);
    toast.success(`Welcome back, ${data.student.fullName.split(" ")[0]}!`);
    return data;
  }, [persist]);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    persist(data);
    toast.success("Account created! Let's begin your assessment.");
    return data;
  }, [persist]);

  const consent = useCallback(async (payload: ConsentPayload): Promise<void> => {
    await api.post("/auth/consent", { ...payload, consentVersion: "consent-v1" });
    setConsentRequired(false);
    toast.success("Thanks! Your consent has been recorded.");
  }, []);

  const clearAuth = useCallback((): void => {
    localStorage.removeItem("dss_token");
    localStorage.removeItem("dss_student");
    setToken(null);
    setStudent(null);
    setConsentRequired(null);
  }, []);

  useEffect(() => {
    registerAuthClearHandler(clearAuth);
  }, [clearAuth]);

  // On first mount with a token, re-derive consent status from the server.
  useEffect(() => {
    void refreshIdentity();
  }, [refreshIdentity]);

  const logout = useCallback((): void => {
    clearAuth();
    toast.info("You've been logged out.");
  }, [clearAuth]);

  const role = student?.role ?? null;

  return createElement(
    AuthContext.Provider,
    { value: { token, student, role, consentRequired, refreshIdentity, login, register, consent, logout, clearAuth } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
