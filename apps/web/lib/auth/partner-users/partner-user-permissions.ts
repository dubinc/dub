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
  "postbacks.read",
  "postbacks.write",
  "messages.send",
  "messages.mark_as_read",
  "program_invites.accept",
  "bounties.submit",
  "payouts.read",
] as const;

const ROLE_PERMISSIONS: Record<PartnerRole, Set<Permission>> = {
  owner: new Set(PERMISSIONS),
  member: new Set([
    "messages.send",
    "messages.mark_as_read",
    "program_invites.accept",
    "bounties.submit",
    "payouts.read",
  ]),
  viewer: new Set([]),
} as const;

export function hasPermission(role: PartnerRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}
