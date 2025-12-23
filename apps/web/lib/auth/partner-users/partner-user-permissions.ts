import type { PartnerRole } from "@dub/prisma/client";

export type Permission = (typeof PERMISSIONS)[number];

const PERMISSIONS = [
  "users.update",
  "users.delete",
  "user_invites.create",
  "user_invites.delete",
  "user_invites.update",
  "partner_profile.update",
  "payout_settings.update",
] as const;

const ROLE_PERMISSIONS: Record<PartnerRole, Permission[]> = {
  owner: [
    "users.update",
    "users.delete",
    "user_invites.create",
    "user_invites.delete",
    "user_invites.update",
    "partner_profile.update",
    "payout_settings.update",
  ],
  member: [],
} as const;

export function hasPermission(role: PartnerRole, permission: Permission) {
  const allowed = ROLE_PERMISSIONS[role] ?? [];

  return allowed.includes(permission);
}
