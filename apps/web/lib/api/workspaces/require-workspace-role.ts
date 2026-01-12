import "server-only";

import { isRoleAvailableForPlan } from "@/lib/workspace-roles";
import { WorkspaceRole } from "@dub/prisma/client";
import { DubApiError } from "../errors";

// Throws an error if the role is not available for the given plan
export function requireWorkspaceRole({
  role,
  plan,
}: {
  role: WorkspaceRole;
  plan: string | null;
}) {
  if (!isRoleAvailableForPlan({ role, plan })) {
    const planName =
      role === WorkspaceRole.billing
        ? "Advanced"
        : role === WorkspaceRole.viewer
          ? "Business"
          : null;

    const message = planName
      ? `The ${role} role is only available on ${planName} plan and above.`
      : `The ${role} role is not available.`;

    throw new DubApiError({
      code: "bad_request",
      message,
    });
  }
}
