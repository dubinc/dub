import { WorkspaceRole } from "@dub/prisma/client";
import type { Icon } from "@dub/ui/icons";
import { Eye, MoneyBill, User, UserCrown } from "@dub/ui/icons";
import { PlanProps } from "./types";

export const WORKSPACE_ROLES = [
  { value: WorkspaceRole.owner, label: "Owner", icon: UserCrown },
  { value: WorkspaceRole.member, label: "Member", icon: User },
  { value: WorkspaceRole.viewer, label: "Viewer", icon: Eye },
  { value: WorkspaceRole.billing, label: "Billing", icon: MoneyBill },
] satisfies { value: WorkspaceRole; label: string; icon: Icon }[];

const ROLE_PLAN_REQUIREMENTS: Record<WorkspaceRole, string[]> = {
  [WorkspaceRole.owner]: [
    "free",
    "pro",
    "business",
    "business plus",
    "business extra",
    "business max",
    "advanced",
    "enterprise",
  ],
  [WorkspaceRole.member]: [
    "free",
    "pro",
    "business",
    "business plus",
    "business extra",
    "business max",
    "advanced",
    "enterprise",
  ],
  [WorkspaceRole.viewer]: [
    "business",
    "business plus",
    "business extra",
    "business max",
    "advanced",
    "enterprise",
  ],
  [WorkspaceRole.billing]: ["advanced", "enterprise"],
};

// Check if a role is available for a given plan
export function isRoleAvailableForPlan({
  role,
  plan,
}: {
  role: WorkspaceRole;
  plan: string | null;
}): boolean {
  if (!plan) {
    return false;
  }

  return ROLE_PLAN_REQUIREMENTS[role].some(
    (availablePlan) => plan === availablePlan,
  );
}

// Get available workspace roles based on the plan
export function getAvailableRolesForPlan(
  plan: PlanProps | null | undefined,
): WorkspaceRole[] {
  if (!plan) {
    return [];
  }

  return Object.values(WorkspaceRole).filter((role) =>
    isRoleAvailableForPlan({ role, plan }),
  );
}
