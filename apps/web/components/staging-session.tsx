"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role =
  | "company_admin"
  | "hr_admin"
  | "payroll_admin"
  | "finance_user"
  | "recruiter"
  | "manager"
  | "operator"
  | "supervisor"
  | "employee"
  | "auditor";

type SessionState = {
  ready: boolean;
  loggedIn: boolean;
  role: Role;
  email: string;
  name: string;
  tenantId: string;
  userId: string;
};

type SessionContextValue = SessionState & {
  login: (input: { role: Role; email: string; name: string }) => void;
  logout: () => void;
  headers: Record<string, string>;
};

const storageKey = "solva-hr-session";

const defaultSession: SessionState = {
  ready: false,
  loggedIn: false,
  role: "operator",
  email: "",
  name: "",
  tenantId: "tenant-solva-demo",
  userId: "demo-user"
};

const roleUserIds: Record<Role, string> = {
  company_admin: "demo-company-admin",
  hr_admin: "demo-hr-admin",
  payroll_admin: "demo-payroll-admin",
  finance_user: "demo-finance-user",
  recruiter: "demo-recruiter",
  manager: "demo-manager",
  operator: "demo-operator",
  supervisor: "demo-supervisor",
  employee: "demo-employee",
  auditor: "demo-auditor"
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function StagingSessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<SessionState>(defaultSession);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      setSession((current) => ({ ...current, ready: true }));
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Omit<SessionState, "ready">;
      setSession({ ...parsed, ready: true });
    } catch {
      setSession((current) => ({ ...current, ready: true }));
    }
  }, []);

  function login(input: { role: Role; email: string; name: string }) {
    const next: SessionState = {
      ready: true,
      loggedIn: true,
      role: input.role,
      email: input.email,
      name: input.name,
      tenantId: "tenant-solva-demo",
      userId: roleUserIds[input.role]
    };

    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSession(next);
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setSession({
      ...defaultSession,
      ready: true
    });
  }

  const headers = useMemo(
    () => ({
      "x-tenant-id": session.tenantId,
      "x-user-id": session.userId,
      "x-user-email": session.email || "demo@solvahr.app",
      "x-user-roles": session.role
    }),
    [session.email, session.role, session.tenantId, session.userId]
  );

  return (
    <SessionContext.Provider
      value={{
        ...session,
        login,
        logout,
        headers
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useStagingSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useStagingSession must be used within StagingSessionProvider");
  }

  return context;
}
