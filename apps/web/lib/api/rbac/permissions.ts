import { WorkspaceRole } from "@dub/prisma/client";

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
  "oauth_apps.read",
  "oauth_apps.write",
  "integrations.read",
  "integrations.write",
  "webhooks.read",
  "webhooks.write",
  "folders.read",
  "folders.write",
  "payouts.write",
  "groups.write",
  "groups.read",
  "messages.read",
  "messages.write",
  "billing.write",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ROLE_PERMISSIONS: {
  action: PermissionAction;
  description: string;
  roles: WorkspaceRole[];
}[] = [
  {
    action: "links.read",
    description: "access links",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "links.write",
    description: "create, update, or delete links",
    roles: ["owner", "member"],
  },
  {
    action: "analytics.read",
    description: "access analytics",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "workspaces.read",
    description: "access workspaces",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "workspaces.write",
    description: "update or delete the current workspace",
    roles: ["owner"],
  },
  {
    action: "domains.read",
    description: "access domains",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "domains.write",
    description: "create, update, or delete domains",
    roles: ["owner"],
  },
  {
    action: "tags.read",
    description: "access tags",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "tags.write",
    description: "create, update, or delete tags",
    roles: ["owner", "member"],
  },
  {
    action: "tokens.read",
    description: "access API keys",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "tokens.write",
    description: "create, update, or delete API keys",
    roles: ["owner"],
  },
  {
    action: "oauth_apps.read",
    description: "read OAuth apps",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "oauth_apps.write",
    description: "create, update, or delete OAuth apps",
    roles: ["owner"],
  },
  {
    action: "integrations.read",
    description: "read authorized OAuth apps",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "integrations.write",
    description: "disconnect authorized OAuth apps",
    roles: ["owner", "member"],
  },
  {
    action: "webhooks.read",
    description: "read webhooks",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "webhooks.write",
    description: "create, update, or delete webhooks",
    roles: ["owner"],
  },
  {
    action: "folders.read",
    description: "access folders",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "folders.write",
    description: "create, update, or delete folders",
    roles: ["owner", "member"],
  },
  {
    action: "payouts.write",
    description: "confirm payouts",
    roles: ["owner", "billing"],
  },
  {
    action: "billing.write",
    description: "create, update, or delete payment methods",
    roles: ["owner", "billing"],
  },
  {
    action: "groups.write",
    description: "create, update, or delete groups",
    roles: ["owner", "member"],
  },
  {
    action: "groups.read",
    description: "access groups",
    roles: ["owner", "member", "viewer", "billing"],
  },
  {
    action: "messages.write",
    description: "create, update, or delete messages",
    roles: ["owner", "member"],
  },
  {
    action: "messages.read",
    description: "access messages",
    roles: ["owner", "member", "viewer", "billing"],
  },
];

// Get permissions for a role
export const getPermissionsByRole = (role: WorkspaceRole) => {
  return ROLE_PERMISSIONS.filter(({ roles }) => roles.includes(role)).map(
    ({ action }) => action,
  );
};
