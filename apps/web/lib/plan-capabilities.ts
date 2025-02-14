import { WorkspaceProps } from "@/lib/types";

// Get the capabilities of a workspace based on the plan
export const getPlanCapabilities = (
  plan: WorkspaceProps["plan"] | undefined | string,
) => {
  return {
    canAddFolder: plan && !["free"].includes(plan),
    canManageFolderPermissions: plan && !["free", "pro"].includes(plan), // default access level is write
  };
};
