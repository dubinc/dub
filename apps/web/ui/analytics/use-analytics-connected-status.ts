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

  const all = [
    connectionSetupComplete,
    leadTrackingSetupComplete,
    saleTrackingSetupComplete,
  ];

  return {
    isConnected: all.some(Boolean),
    isFullyConnected: all.every(Boolean),
  };
}
