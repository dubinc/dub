import { Role } from "@prisma/client";

export const PERMISSION_ACTIONS = [
  "workspaces.read",
  "workspaces.write",
  "links.read",
  "links.write",
  "tags.read",
  "tags.write",
  "analytics.read",
  "domains.read",
  "domains.write",
  "tokens.read",
  "tokens.write",
  "conversions.write",
  "oauth_apps.read",
  "oauth_apps.write",
  "integrations.read",
  "integrations.disconnect",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ROLE_PERMISSIONS: {
  action: PermissionAction;
  description: string;
  roles: Role[];
}[] = [
  {
    action: "links.read",
    description: "access links",
    roles: ["owner", "member"],
  },
  {
    action: "links.write",
    description: "create, update, or delete links",
    roles: ["owner", "member"],
  },
  {
    action: "analytics.read",
    description: "access analytics",
    roles: ["owner", "member"],
  },
  {
    action: "workspaces.read",
    description: "access workspaces",
    roles: ["owner", "member"],
  },
  {
    action: "workspaces.write",
    description: "update or delete the current workspace",
    roles: ["owner"],
  },
  {
    action: "domains.read",
    description: "access domains",
    roles: ["owner", "member"],
  },
  {
    action: "domains.write",
    description: "create, update, or delete domains",
    roles: ["owner"],
  },
  {
    action: "tags.read",
    description: "access tags",
    roles: ["owner", "member"],
  },
  {
    action: "tags.write",
    description: "create, update, or delete tags",
    roles: ["owner", "member"],
  },
  {
    action: "conversions.write",
    description: "track conversions",
    roles: ["owner"],
  },
  {
    action: "tokens.read",
    description: "access API keys",
    roles: ["owner", "member"],
  },
  {
    action: "tokens.write",
    description: "create, update, or delete API keys",
    roles: ["owner", "member"],
  },
  {
    action: "oauth_apps.read",
    description: "Read OAuth apps",
    roles: ["owner", "member"],
  },
  {
    action: "oauth_apps.write",
    description: "Create, update, or delete OAuth apps",
    roles: ["owner"],
  },
  {
    action: "integrations.read",
    description: "Read authorized OAuth apps",
    roles: ["owner", "member"],
  },
  {
    action: "integrations.disconnect",
    description: "Disconnect authorized OAuth apps",
    roles: ["owner", "member"],
  },
];

// Get permissions for a role
export const getPermissionsByRole = (role: Role) => {
  return ROLE_PERMISSIONS.filter(({ roles }) => roles.includes(role)).map(
    ({ action }) => action,
  );
};
