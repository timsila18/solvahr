import { redirect } from "next/navigation";
import { normalizeRole, type AuthUserProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      status: "active",
    } satisfies AuthUserProfile;
  }

  return {
    ...data,
    role: normalizeRole(data.role),
  } satisfies AuthUserProfile;
}

export async function requireAuthenticatedProfile() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}
