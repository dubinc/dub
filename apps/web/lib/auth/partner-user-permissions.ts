import type { PartnerUser } from "@prisma/client";
import { DubApiError } from "../api/errors";

type Permission = (typeof PERMISSIONS)[number];
type Role = PartnerUser["role"];

const PERMISSIONS = ["user.update", "user.invite", "payout.update"] as const;

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["user.update", "user.invite", "payout.update"],
  member: [],
} as const;

export function hasPermission(role: Role, permission: Permission) {
  const allowed = ROLE_PERMISSIONS[role] ?? [];

  return allowed.includes(permission);
}

export function throwIfNoPermission({
  role,
  permission,
  message = "You don't have the necessary permissions to complete this request.",
}: {
  role: Role;
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
