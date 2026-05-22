import { getCurrentUserProfile } from "@/lib/session";
import { MarketingSite } from "@/components/marketing-site";
import { redirect } from "next/navigation";

export default async function PayrollMarketingPage() {
  const profile = await getCurrentUserProfile();
  if (profile) {
    redirect("/?module=payroll&item=Payroll%20Dashboard");
  }

  return <MarketingSite variant="payroll" />;
}
