import { isRoleAvailableForPlan } from "@/lib/workspace-roles";
import { WorkspaceRole } from "@dub/prisma/client";
import "server-only";
import { DubApiError } from "../errors";

// Throws an error if the role is not available for the given plan
export function assertRoleAllowedForPlan({
  role,
  plan,
}: {
  role: WorkspaceRole;
  plan: string | null;
}) {
  const isAvailable = isRoleAvailableForPlan({
    role,
    plan,
  });

  if (isAvailable) {
    return;
  }

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
