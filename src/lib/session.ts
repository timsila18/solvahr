import { redirect } from "next/navigation";
import { normalizeRole, type AuthUserProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value == null) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

export async function getCurrentSession() {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.getSession();
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, company_id, full_name, email, phone, role, employee_id, branch_id, department_id, last_login, status"
    )
    .eq("id", user.id)
    .single();

  const metadataStatus =
    typeof user.app_metadata.status === "string"
      ? user.app_metadata.status
      : typeof user.user_metadata.status === "string"
        ? user.user_metadata.status
        : "active";

  if (error || !data) {
    return {
      id: user.id,
      company_id: null,
      full_name: user.user_metadata.full_name ?? user.email ?? "Solva User",
      email: user.email ?? "",
      phone: null,
      role: normalizeRole((user.app_metadata.role as string | undefined) ?? "Employee"),
      employee_id: null,
      branch_id: null,
      department_id: null,
      last_login: null,
      status: metadataStatus,
    } satisfies AuthUserProfile;
  }

  return {
    ...data,
    role: normalizeRole(data.role),
    status:
      safeString(data.status).toLowerCase() === "pending_approval" || metadataStatus === "pending_approval"
        ? "pending_approval"
        : safeString(data.status, metadataStatus),
  } satisfies AuthUserProfile;
}

export async function requireAuthenticatedProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}
