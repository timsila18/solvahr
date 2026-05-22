import { redirect } from "next/navigation";
import { CvServiceAdmin } from "@/components/cv-service-admin";
import { getCurrentUserProfile } from "@/lib/session";

export default async function CvServiceAdminPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login?redirectTo=/cv-service-admin");
  }
  if (!["Super Admin", "HR Admin", "Payroll Admin"].includes(profile.role)) {
    redirect("/forbidden");
  }

  return <CvServiceAdmin />;
}
