import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { normalizeRole, roleCanAccessModule } from "@/lib/auth";

const LAST_ACTIVITY_COOKIE = "solva_last_activity_at";
const DEFAULT_SESSION_TIMEOUT_MINUTES = 60;

const publicPaths = [
  "/login",
  "/signup",
  "/cv-service",
  "/pending-approval",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/auth/callback",
  "/unauthorized",
  "/forbidden",
];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const moduleRoutePrefixes: Array<{ prefix: string; moduleKey: string }> = [
  { prefix: "/admin", moduleKey: "administration" },
  { prefix: "/organization", moduleKey: "administration" },
  { prefix: "/people", moduleKey: "people" },
  { prefix: "/payroll", moduleKey: "payroll" },
  { prefix: "/reports", moduleKey: "reports" },
  { prefix: "/audit", moduleKey: "audit" },
  { prefix: "/leave", moduleKey: "leave" },
  { prefix: "/performance", moduleKey: "performance" },
  { prefix: "/recruitment", moduleKey: "recruitment" },
  { prefix: "/training", moduleKey: "training" },
  { prefix: "/assets", moduleKey: "assets" },
  { prefix: "/integrations", moduleKey: "integrations" },
  { prefix: "/consultancy", moduleKey: "consultancy" },
  { prefix: "/users", moduleKey: "administration" },
  { prefix: "/approvals", moduleKey: "dashboard" },
  { prefix: "/settings/admin", moduleKey: "administration" },
  { prefix: "/administration", moduleKey: "administration" },
];

function getRestrictedModule(pathname: string) {
  return (
    moduleRoutePrefixes.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )?.moduleKey ?? null
  );
}

function getRoleHome(role: string) {
  if (role === "Employee") {
    return { module: "ess", item: "My Dashboard" };
  }

  if (role === "Supervisor") {
    return { module: "leave", item: "Approval Queue" };
  }

  if (role === "Payroll Admin" || role === "Finance Officer") {
    return { module: "payroll", item: "Payroll Dashboard" };
  }

  if (role === "Manager") {
    return { module: "dashboard", item: "Pending Approvals" };
  }

  if (role === "Recruiter") {
    return { module: "recruitment", item: "Job Requisitions" };
  }

  return { module: "dashboard", item: "Overview" };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/well-known/") ||
    pathname.includes("well-known") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  ) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath(pathname)) {
    if (pathname === "/pending-approval" || pathname === "/cv-service") {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  let role = normalizeRole(typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "Employee");
  let userStatus =
    typeof user?.user_metadata?.status === "string"
      ? user.user_metadata.status
      : typeof user?.app_metadata?.status === "string"
        ? user.app_metadata.status
        : "";
  let sessionTimeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES;

  if (user) {
    const lastActivityValue = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value ?? "";
    const lastActivity = Number(lastActivityValue);
    const now = Date.now();
    const maxIdleMs = sessionTimeoutMinutes * 60 * 1000;

    if (Number.isFinite(lastActivity) && lastActivity > 0 && now - lastActivity > maxIdleMs) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/auth/logout";
      url.search = "";
      url.searchParams.set("redirectTo", "/login?reason=session_timeout");
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete(LAST_ACTIVITY_COOKIE);
      return redirectResponse;
    }
  }

  if (user && userStatus === "pending_approval" && pathname !== "/pending-approval") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending-approval";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const employeeWorkflowException = role === "Employee" && pathname === "/leave/new";
  const restrictedModule = employeeWorkflowException ? null : getRestrictedModule(pathname);
  if (user && restrictedModule && !roleCanAccessModule(role, restrictedModule)) {
    const home = getRoleHome(role);
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("module", home.module);
    url.searchParams.set("item", home.item);
    return NextResponse.redirect(url);
  }

  if (user) {
    response.cookies.set(LAST_ACTIVITY_COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: Math.max(15, sessionTimeoutMinutes) * 60,
    });
  } else {
    response.cookies.delete(LAST_ACTIVITY_COOKIE);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest).*)"],
};
