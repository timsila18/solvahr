import { AppDashboard } from "../components/app-dashboard";
import { StagingSessionProvider } from "../components/staging-session";

export default function Home() {
  return (
    <StagingSessionProvider>
      <AppDashboard />
    </StagingSessionProvider>
  );
}
