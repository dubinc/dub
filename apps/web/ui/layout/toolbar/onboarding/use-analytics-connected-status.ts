import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";

export function useAnalyticsConnectedStatus() {
  const [connectionSetupComplete] = useWorkspaceStore<boolean>(
    "analyticsSettingsConnectionSetupComplete",
  );
  const [leadTrackingSetupComplete] = useWorkspaceStore<boolean>(
    "analyticsSettingsLeadTrackingSetupComplete",
  );
  const [saleTrackingSetupComplete] = useWorkspaceStore<boolean>(
    "analyticsSettingsSaleTrackingSetupComplete",
  );

  return {
    isConnected: [
      connectionSetupComplete,
      leadTrackingSetupComplete,
      saleTrackingSetupComplete,
    ].some(Boolean),
  };
}
