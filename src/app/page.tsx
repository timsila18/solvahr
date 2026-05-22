import { getCurrentUserProfile } from "@/lib/session";
import { MarketingSite } from "@/components/marketing-site";
import { SolvaShell } from "@/components/solva-shell";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; item?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return <MarketingSite variant="home" />;
  }
  if (profile.status === "pending_approval") {
    redirect("/pending-approval");
  }
  const params = await searchParams;
  return <SolvaShell initialItem={params.item} initialModuleKey={params.module} />;
}
