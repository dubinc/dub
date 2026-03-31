import { DubApiError } from "@/lib/api/errors";
import { PartnerRole } from "@dub/prisma/client";
import { hasPermission, Permission } from "./partner-user-permissions";

export function throwIfNoPermission({
  role,
  permission,
  message = "You don't have the necessary permissions to complete this request.",
}: {
  role: PartnerRole;
  permission: Permission;
  message?: string;
}) {
  if (hasPermission(role, permission)) {
    return;
  }

  throw new DubApiError({
    code: "forbidden",
    message,
  });
}
