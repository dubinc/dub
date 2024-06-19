import { Role } from "@prisma/client";

export const availableScopes = [
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
] as const;

export type Scope = (typeof availableScopes)[number];

export const resourcePermissions = [
  {
    name: "Workspaces",
    key: "workspaces",
    description: "Read, update, and delete workspaces",
    permissions: [
      {
        permission: "Read",
        scope: "workspaces.read",
        description: "Read workspaces",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "workspaces.write",
        description: "Write workspaces",
        roles: ["owner"],
      },
    ],
  },
  {
    name: "Links",
    key: "links",
    description: "Create, read, update, and delete links",
    permissions: [
      {
        permission: "Read",
        scope: "links.read",
        description: "Read links",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "links.write",
        description: "Write links",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Tags",
    key: "tags",
    description: "Create, read, update, and delete tags",
    permissions: [
      {
        permission: "Read",
        scope: "tags.read",
        description: "Read tags",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "tags.write",
        description: "Write tags",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Domains",
    key: "domains",
    description: "Create, read, update, and delete domains",
    permissions: [
      {
        permission: "Read",
        scope: "domains.read",
        description: "Read domains",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "domains.write",
        description: "Write domains",
        roles: ["owner"],
      },
    ],
  },
  {
    name: "API Keys",
    key: "tokens",
    description: "Create, read, update, and delete API keys",
    permissions: [
      {
        permission: "Read",
        scope: "tokens.read",
        description: "Read tokens",
        roles: ["owner", "member"],
      },
      {
        permission: "Write",
        scope: "tokens.write",
        description: "Write tokens",
        roles: ["owner", "member"],
      },
    ],
  },
  {
    name: "Analytics",
    key: "analytics",
    description: "Read analytics",
    permissions: [
      {
        permission: "Read",
        scope: "analytics.read",
        description: "Read analytics",
        roles: ["owner", "member"],
      },
    ],
  },
] as const;

// Map roles to scopes
// { owner: ["workspace.write"], member: ["workspace.read"] }
export const roleScopeMapping = resourcePermissions.reduce<
  Record<Role, Scope[]>
>(
  (acc, { permissions }) => {
    permissions.forEach(({ scope, roles }) => {
      roles.forEach((role) => {
        if (!acc[role]) {
          acc[role] = [];
        }

        acc[role].push(scope);
      });
    });

    return acc;
  },
  {} as Record<Role, Scope[]>,
);
